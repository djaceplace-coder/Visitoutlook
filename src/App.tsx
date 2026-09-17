/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { Splash } from './components/Splash';
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

type AppState = 'splash' | 'signin' | 'app';

export default function App() {
  const [appState, setAppState] = useState<AppState>('app');
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

  // Synchronize dynamic theme accent and dark mode
  useEffect(() => {
    document.documentElement.style.setProperty('--color-brand-cobalt', settings.themeColor);
    if (settings.isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings.themeColor, settings.isDarkMode]);

  useEffect(() => {
    if (appState === 'splash') {
      const timer = setTimeout(() => {
        setAppState('signin');
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [appState]);

  if (appState === 'splash') {
    return <Splash />;
  }

  if (appState === 'signin') {
    return <SignIn onSignIn={() => setAppState('app')} />;
  }

  return (
    <>
      <AppShell 
        currentSection={currentSection} 
        onNavigate={setCurrentSection}
        onSignOut={() => setAppState('signin')}
        isFolderPaneOpen={isFolderPaneOpen}
        onToggleFolderPane={() => setIsFolderPaneOpen(prev => !prev)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
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
            onSendEmailTo={(email, name) => {
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

