/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { SignIn } from './components/SignIn';
import { AppShell, Section } from './components/AppShell';
import { InboxSection } from './components/sections/InboxSection';
import { CalendarSection } from './components/sections/CalendarSection';
import { PeopleSection } from './components/sections/PeopleSection';
import { TasksSection } from './components/sections/TasksSection';
import { AppsSection } from './components/sections/AppsSection';
import { SettingsPanel, OutlookSettings } from './components/mail/SettingsPanel';
import { AdvancedSearchModal, AdvancedSearchFilters } from './components/mail/AdvancedSearchModal';
import { INITIAL_FOLDERS } from './data/initialMailData';
import { EnvelopeLoader } from './components/EnvelopeLoader';
import { IconLoader } from './components/IconLoader';
import { supabase, isSupabaseConfigured } from './lib/supabase';

type AppState = 'entry-loader' | 'signin' | 'post-signin-loader' | 'app';

export default function App() {
  const [appState, setAppState] = useState<AppState>('entry-loader');
  const [userEmail, setUserEmail] = useState('alex.bennett@outlook.com');
  const [currentSection, setCurrentSection] = useState<Section>('inbox');
  const [isFolderPaneOpen, setIsFolderPaneOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [prefillCompose, setPrefillCompose] = useState<{ to: string; subject?: string } | null>(null);
  const [prefillEvent, setPrefillEvent] = useState<{ title?: string; attendees?: string[] } | null>(null);

  // Settings state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<OutlookSettings>({
    themeColor: '#0078D4',
    isDarkMode: false,
    density: 'normal',
    readingPanePosition: 'right',
    enableFocusedInbox: true,
    groupByConversation: true,
    autoRepliesEnabled: false,
    autoRepliesText: 'Thank you for reaching out. I am currently away from the office with limited access to email and will reply upon return.'
  });

  // Advanced search state
  const [isAdvancedSearchOpen, setIsAdvancedSearchOpen] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedSearchFilters | null>(null);

  // Supabase Session Listener (keeps user logged in on page reload, routes to signin on expire)
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;

    // Check current active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.email) {
        setUserEmail(session.user.email);
        // If still on signin, advance
        setAppState(prev => (prev === 'signin' ? 'app' : prev));
      }
    });

    // Subscribe to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user?.email) {
        setUserEmail(session.user.email);
      } else {
        // If session was cleared / logged out
        setAppState('signin');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Synchronize dynamic theme accent and dark mode
  useEffect(() => {
    document.documentElement.style.setProperty('--color-brand-cobalt', settings.themeColor);
    if (settings.isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings.themeColor, settings.isDarkMode]);

  const handleSignOut = async () => {
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.error('Sign out error:', err);
      }
    }
    setAppState('signin');
  };

  if (appState === 'entry-loader') {
    return <EnvelopeLoader onComplete={() => setAppState('signin')} />;
  }

  if (appState === 'signin') {
    return (
      <SignIn
        onSignIn={(email) => {
          if (email) setUserEmail(email);
          setAppState('post-signin-loader');
        }}
      />
    );
  }

  if (appState === 'post-signin-loader') {
    return (
      <IconLoader
        userEmail={userEmail}
        onComplete={() => setAppState('app')}
      />
    );
  }

  return (
    <>
      <AppShell 
        currentSection={currentSection} 
        onNavigate={setCurrentSection}
        onSignOut={handleSignOut}
        isFolderPaneOpen={isFolderPaneOpen}
        onToggleFolderPane={() => setIsFolderPaneOpen(prev => !prev)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        userEmail={userEmail}
        onOpenAdvancedSearch={() => {
          setIsAdvancedSearchOpen(true);
          setIsSettingsOpen(false);
        }}
        onOpenSettings={() => {
          setIsSettingsOpen(true);
          setIsAdvancedSearchOpen(false);
        }}
      >
        {currentSection === 'inbox' && (
          <InboxSection 
            isFolderPaneOpen={isFolderPaneOpen}
            onToggleFolderPane={() => setIsFolderPaneOpen(prev => !prev)}
            searchQuery={searchQuery}
            advancedFilters={advancedFilters}
            onClearAdvancedFilters={() => setAdvancedFilters(null)}
            density={settings.density}
            onDensityChange={(d) => setSettings(prev => ({ ...prev, density: d }))}
            readingPanePosition={settings.readingPanePosition}
            onReadingPanePositionChange={(p) => setSettings(prev => ({ ...prev, readingPanePosition: p }))}
            enableFocusedInbox={settings.enableFocusedInbox}
            onNavigateToSection={setCurrentSection}
            prefillCompose={prefillCompose}
            onClearPrefillCompose={() => setPrefillCompose(null)}
            autoRepliesEnabled={settings.autoRepliesEnabled}
            onDisableAutoReplies={() => setSettings(prev => ({ ...prev, autoRepliesEnabled: false }))}
            onOpenSettings={() => setIsSettingsOpen(true)}
            accountEmail={userEmail || 'alex.bennett@outlook.com'}
          />
        )}
        {currentSection === 'calendar' && (
          <CalendarSection 
            prefillEvent={prefillEvent}
            onClearPrefillEvent={() => setPrefillEvent(null)}
            searchQuery={searchQuery}
          />
        )}
        {currentSection === 'people' && (
          <PeopleSection
            searchQuery={searchQuery}
            onSendEmailTo={(email) => {
              setPrefillCompose({ to: email });
              setCurrentSection('inbox');
            }}
            onScheduleMeetingWith={(contact) => {
              setPrefillEvent({
                title: `Meeting with ${contact.firstName} ${contact.lastName}`,
                attendees: [contact.email]
              });
              setCurrentSection('calendar');
            }}
          />
        )}
        {currentSection === 'tasks' && <TasksSection searchQuery={searchQuery} />}
        {currentSection === 'apps' && <AppsSection searchQuery={searchQuery} />}
      </AppShell>

      {/* Settings Flyout */}
      <SettingsPanel
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={(newVals) => setSettings(prev => ({ ...prev, ...newVals }))}
      />

      {/* Advanced Search Modal */}
      <AdvancedSearchModal
        isOpen={isAdvancedSearchOpen}
        onClose={() => setIsAdvancedSearchOpen(false)}
        folders={INITIAL_FOLDERS}
        currentFolderId="inbox"
        initialFilters={advancedFilters || undefined}
        onApplyFilters={(filters) => {
          setAdvancedFilters(filters);
          if (currentSection !== 'inbox') {
            setCurrentSection('inbox');
          }
        }}
        onResetFilters={() => setAdvancedFilters(null)}
      />
    </>
  );
}
