import React, { useState, useMemo, useEffect } from 'react';
import {
  Reply,
  ReplyAll,
  Forward,
  Trash2,
  Archive,
  Mail,
  MailOpen,
  Pin,
  Flag,
  Paperclip,
  Printer,
  ChevronDown,
  ChevronUp,
  FileText,
  FileSpreadsheet,
  FileImage,
  Download,
  Eye,
  ShieldAlert,
  Check,
  Maximize2,
  Minimize2,
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Link2,
  X,
  Send,
  Clock,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { EmailMessage, EmailAttachment } from '../../types/mail';
import { EmptyInboxGraphic } from './EmptyInboxGraphic';
import { OutlookMobileQrGraphic } from './OutlookMobileQrGraphic';

interface ReadingPaneProps {
  message: EmailMessage | null;
  allMessages: EmailMessage[];
  onReply: (to: string, subject: string, initialBody?: string) => void;
  onReplyAll: (to: string[], cc: string[], subject: string, initialBody?: string) => void;
  onForward: (subject: string, body: string) => void;
  onDelete: (id: string) => void;
  onArchive: (id: string) => void;
  onToggleRead: (id: string) => void;
  onToggleFlag: (id: string) => void;
  onTogglePin: (id: string) => void;
  onSendInlineReply: (replyData: {
    threadId: string;
    subject: string;
    body: string;
    to: Array<{ name: string; email: string }>;
    type: 'reply' | 'replyAll' | 'forward';
  }) => void;
  onOpenFullCompose: (prefill: {
    to: string;
    subject: string;
    body: string;
  }) => void;
  readingPanePosition: 'right' | 'bottom' | 'off';
}

export function ReadingPane({
  message,
  allMessages,
  onReply,
  onReplyAll,
  onForward,
  onDelete,
  onArchive,
  onToggleRead,
  onToggleFlag,
  onTogglePin,
  onSendInlineReply,
  onOpenFullCompose,
  readingPanePosition
}: ReadingPaneProps) {
  // Inline Reply state
  const [inlineMode, setInlineMode] = useState<'reply' | 'replyAll' | 'forward'>('reply');
  const [replyText, setReplyText] = useState('');
  const [isFormattingActive, setIsFormattingActive] = useState(false);
  const [showCc, setShowCc] = useState(false);
  const [ccInput, setCcInput] = useState('');

  // Conversation Thread expansion state: Map message id -> boolean (true = expanded)
  const [expandedMessages, setExpandedMessages] = useState<Record<string, boolean>>({});

  // Security / External images
  const [allowedImages, setAllowedImages] = useState<Record<string, boolean>>({});
  const [trustedSenders, setTrustedSenders] = useState<Set<string>>(new Set());

  // Attachment preview modal
  const [previewAttachment, setPreviewAttachment] = useState<EmailAttachment | null>(null);

  // Print modal
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Smart suggestions
  const smartReplies = [
    'Sounds great, thanks!',
    'Looks good to me, proceeding.',
    'I will review and get back to you shortly.',
    'Let me know when you are free to sync.'
  ];

  // Retrieve full thread messages
  const threadMessages = useMemo(() => {
    if (!message) return [];
    return allMessages
      .filter((m) => m.threadId === message.threadId)
      .sort((a, b) => a.timestamp - b.timestamp);
  }, [message, allMessages]);

  // Expand latest message by default if state not initialized
  const isMessageExpanded = (msgId: string, isLastInThread: boolean) => {
    if (expandedMessages[msgId] !== undefined) {
      return expandedMessages[msgId];
    }
    // Default: latest message is expanded, older ones collapsed
    return isLastInThread;
  };

  const toggleMessageExpansion = (msgId: string, isLastInThread: boolean) => {
    setExpandedMessages((prev) => ({
      ...prev,
      [msgId]: !isMessageExpanded(msgId, isLastInThread)
    }));
  };

  const handleExpandAll = () => {
    const next: Record<string, boolean> = {};
    threadMessages.forEach((m) => {
      next[m.id] = true;
    });
    setExpandedMessages(next);
  };

  const handleCollapseAll = () => {
    const next: Record<string, boolean> = {};
    threadMessages.forEach((m, idx) => {
      next[m.id] = idx === threadMessages.length - 1; // Keep only last expanded
    });
    setExpandedMessages(next);
  };

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (previewAttachment) {
          setPreviewAttachment(null);
        } else if (isPrintModalOpen) {
          setIsPrintModalOpen(false);
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewAttachment, isPrintModalOpen]);

  const handleSendReply = () => {
    if (!message || !replyText.trim()) return;

    let recipients = [{ name: message.from.name, email: message.from.email }];
    if (inlineMode === 'replyAll') {
      recipients = [
        ...recipients,
        ...message.to.filter((t) => !t.email.includes('alex.bennett')),
        ...(message.cc || [])
      ];
    }

    onSendInlineReply({
      threadId: message.threadId,
      subject:
        inlineMode === 'forward'
          ? `Fwd: ${message.subject.replace(/^(Re|Fwd):\s*/i, '')}`
          : `Re: ${message.subject.replace(/^(Re|Fwd):\s*/i, '')}`,
      body: replyText.trim(),
      to: recipients,
      type: inlineMode
    });

    setReplyText('');
  };

  if (!message) {
    return (
      <main
        id="outlook-reading-pane"
        aria-label="Reading pane"
        className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-[#FAFBFD] select-none overflow-y-auto"
      >
        <div className="max-w-md w-full flex flex-col items-center">
          <EmptyInboxGraphic
            title="Select an item to read"
            subtitle="Nothing is selected"
          />

          {/* Promotion Card matching screenshot styling */}
          <div className="mt-8 pt-6 border-t border-gray-200/80 w-full flex flex-col items-center">
            <OutlookMobileQrGraphic compact />
          </div>
        </div>
      </main>
    );
  }

  const isSenderTrusted = trustedSenders.has(message.from.email);
  const showBlockedBanner = !isSenderTrusted && !allowedImages[message.id];

  return (
    <main
      id="outlook-reading-pane"
      aria-label="Reading pane"
      className="flex-1 flex flex-col bg-white min-w-0 overflow-hidden"
    >
      {/* 1. Header Action & Subject Bar */}
      <div className="px-6 py-4 border-b border-gray-200 bg-white flex-shrink-0">
        <div className="flex items-start justify-between gap-4 mb-3">
          {/* Subject Title & Flags */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-xl font-bold text-[#1F2937] tracking-tight leading-snug">
                {message.subject}
              </h1>

              {/* High Importance Pill */}
              {message.importance === 'high' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 text-[11px] font-semibold">
                  <AlertCircle size={12} />
                  High Importance
                </span>
              )}

              {/* Pinned pill */}
              {message.pinned && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-brand-cobalt text-[11px] font-semibold">
                  <Pin size={11} className="fill-brand-cobalt" />
                  Pinned
                </span>
              )}
            </div>

            {/* Conversation Thread Stats */}
            {threadMessages.length > 1 && (
              <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500">
                <span>{threadMessages.length} messages in conversation</span>
                <span className="text-gray-300">•</span>
                <button
                  type="button"
                  onClick={handleExpandAll}
                  className="text-brand-cobalt hover:underline font-medium"
                >
                  Expand all
                </button>
                <span className="text-gray-300">•</span>
                <button
                  type="button"
                  onClick={handleCollapseAll}
                  className="text-brand-cobalt hover:underline font-medium"
                >
                  Collapse all
                </button>
              </div>
            )}
          </div>

          {/* Quick Header Action Icons */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              type="button"
              onClick={() => {
                setInlineMode('reply');
                onReply(message.from.email, `Re: ${message.subject}`);
              }}
              className="p-1.5 text-gray-600 hover:text-brand-cobalt hover:bg-gray-100 rounded-none transition-colors"
              title="Reply"
            >
              <Reply size={16} />
            </button>
            <button
              type="button"
              onClick={() => {
                setInlineMode('replyAll');
                onReplyAll(
                  [message.from.email],
                  (message.cc || []).map((c) => c.email),
                  `Re: ${message.subject}`
                );
              }}
              className="p-1.5 text-gray-600 hover:text-brand-cobalt hover:bg-gray-100 rounded-none transition-colors"
              title="Reply All"
            >
              <ReplyAll size={16} />
            </button>
            <button
              type="button"
              onClick={() => {
                setInlineMode('forward');
                onForward(
                  `Fwd: ${message.subject}`,
                  `\n\n--- Forwarded Message ---\nFrom: ${message.from.name} <${message.from.email}>\nDate: ${message.date}\nSubject: ${message.subject}\n\n${message.body}`
                );
              }}
              className="p-1.5 text-gray-600 hover:text-brand-cobalt hover:bg-gray-100 rounded-none transition-colors"
              title="Forward"
            >
              <Forward size={16} />
            </button>
            <button
              type="button"
              onClick={() => onDelete(message.id)}
              className="p-1.5 text-gray-600 hover:text-red-600 hover:bg-gray-100 rounded-none transition-colors"
              title="Delete (Del)"
            >
              <Trash2 size={16} />
            </button>
            <button
              type="button"
              onClick={() => onArchive(message.id)}
              className="p-1.5 text-gray-600 hover:text-brand-cobalt hover:bg-gray-100 rounded-none transition-colors"
              title="Archive"
            >
              <Archive size={16} />
            </button>
            <button
              type="button"
              onClick={() => onToggleFlag(message.id)}
              className={`p-1.5 rounded-none transition-colors ${
                message.flagged
                  ? 'text-brand-terracotta bg-amber-50'
                  : 'text-gray-600 hover:text-brand-terracotta hover:bg-gray-100'
              }`}
              title={message.flagged ? 'Clear flag' : 'Flag message'}
            >
              <Flag size={16} className={message.flagged ? 'fill-brand-terracotta' : ''} />
            </button>
            <button
              type="button"
              onClick={() => onTogglePin(message.id)}
              className={`p-1.5 rounded-none transition-colors ${
                message.pinned
                  ? 'text-brand-cobalt bg-blue-50'
                  : 'text-gray-600 hover:text-brand-cobalt hover:bg-gray-100'
              }`}
              title={message.pinned ? 'Unpin message' : 'Pin to top'}
            >
              <Pin size={16} className={message.pinned ? 'fill-brand-cobalt' : ''} />
            </button>
            <button
              type="button"
              onClick={() => setIsPrintModalOpen(true)}
              className="p-1.5 text-gray-600 hover:text-brand-cobalt hover:bg-gray-100 rounded-none transition-colors"
              title="Print conversation"
            >
              <Printer size={16} />
            </button>
          </div>
        </div>

        {/* 2. Outlook Privacy & External Images Banner */}
        {showBlockedBanner && (
          <div className="p-2.5 bg-[#FFF9E6] border border-[#FDE68A] text-xs text-amber-900 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <ShieldAlert size={15} className="text-amber-700 flex-shrink-0" />
              <span>
                To help protect your privacy, remote pictures and tracking beacons were blocked.
              </span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                type="button"
                onClick={() =>
                  setAllowedImages((prev) => ({ ...prev, [message.id]: true }))
                }
                className="font-semibold text-brand-cobalt hover:underline"
              >
                Download pictures
              </button>
              <span className="text-amber-300">|</span>
              <button
                type="button"
                onClick={() => {
                  setTrustedSenders((prev) => new Set(prev).add(message.from.email));
                  setAllowedImages((prev) => ({ ...prev, [message.id]: true }));
                }}
                className="font-semibold text-brand-cobalt hover:underline"
              >
                Always trust {message.from.name}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 3. Conversation Messages Stream */}
      <div className="flex-1 overflow-y-auto divide-y divide-gray-200">
        {threadMessages.map((msg, idx) => {
          const isLast = idx === threadMessages.length - 1;
          const isExpanded = isMessageExpanded(msg.id, isLast);

          return (
            <article
              key={msg.id}
              className={`transition-colors ${
                isLast ? 'bg-white' : 'bg-[#FAFAFA]'
              }`}
            >
              {/* Message Header */}
              <div
                onClick={() => toggleMessageExpansion(msg.id, isLast)}
                className="px-6 py-3.5 flex items-start justify-between gap-4 cursor-pointer hover:bg-gray-50/80 select-none"
              >
                {/* Sender Avatar & Info */}
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-10 h-10 bg-brand-cobalt text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                    {msg.from.name
                      .split(' ')
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join('')
                      .toUpperCase()}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-[#1F2937]">
                        {msg.from.name}
                      </span>
                      <span className="text-xs text-gray-500 font-normal">
                        &lt;{msg.from.email}&gt;
                      </span>
                    </div>

                    {/* Collapsed view snippet */}
                    {!isExpanded && (
                      <p className="text-xs text-gray-500 truncate max-w-lg mt-0.5">
                        {msg.preview}
                      </p>
                    )}

                    {/* Expanded recipients */}
                    {isExpanded && (
                      <div className="text-xs text-gray-500 mt-1 flex items-center gap-1.5 flex-wrap">
                        <span>To:</span>
                        <span className="text-gray-800 font-medium">
                          {msg.to.map((t) => t.name).join(', ')}
                        </span>
                        {msg.cc && msg.cc.length > 0 && (
                          <>
                            <span className="text-gray-300">•</span>
                            <span>Cc:</span>
                            <span className="text-gray-800 font-medium">
                              {msg.cc.map((c) => c.name).join(', ')}
                            </span>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right side: Date + Expansion Chevron */}
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-xs text-gray-400">{msg.date}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleMessageExpansion(msg.id, isLast);
                    }}
                    className="text-gray-400 hover:text-gray-600 p-0.5"
                    title={isExpanded ? 'Collapse' : 'Expand'}
                  >
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                </div>
              </div>

              {/* Expanded Message Content */}
              {isExpanded && (
                <div>
                  {/* Attachments Section if present */}
                  {msg.attachments && msg.attachments.length > 0 && (
                    <div className="px-6 py-3 bg-[#F8FAFC] border-y border-gray-200 flex items-center gap-3 flex-wrap">
                      <div className="flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase tracking-wider mr-2">
                        <Paperclip size={13} />
                        <span>Attachments ({msg.attachments.length})</span>
                      </div>

                      {msg.attachments.map((att) => (
                        <div
                          key={att.id}
                          className="inline-flex items-center gap-2.5 px-3 py-2 bg-white border border-gray-200 text-xs text-gray-800 shadow-2xs hover:border-brand-cobalt transition-colors group/att"
                        >
                          {att.type === 'pdf' && (
                            <FileText size={16} className="text-red-600 flex-shrink-0" />
                          )}
                          {att.type === 'sheet' && (
                            <FileSpreadsheet
                              size={16}
                              className="text-emerald-600 flex-shrink-0"
                            />
                          )}
                          {att.type === 'img' && (
                            <FileImage size={16} className="text-blue-600 flex-shrink-0" />
                          )}

                          <div className="truncate max-w-[150px]">
                            <div className="font-semibold truncate">{att.name}</div>
                            <div className="text-[10px] text-gray-400">{att.size}</div>
                          </div>

                          <div className="flex items-center gap-1 pl-1 border-l border-gray-100">
                            <button
                              type="button"
                              onClick={() => setPreviewAttachment(att)}
                              className="p-1 text-gray-400 hover:text-brand-cobalt"
                              title="Preview attachment"
                            >
                              <Eye size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                alert(`Simulating download for: ${att.name}`);
                              }}
                              className="p-1 text-gray-400 hover:text-brand-cobalt"
                              title="Download attachment"
                            >
                              <Download size={13} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Body Text */}
                  <div className="px-6 py-6 font-sans text-sm text-[#374151] leading-relaxed whitespace-pre-line bg-white">
                    {msg.body}
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </div>

      {/* 4. Outlook Smart Quick-Replies Bar */}
      <div className="px-6 py-2 bg-[#FAFBFD] border-t border-gray-200 flex items-center gap-2 overflow-x-auto flex-shrink-0">
        <Sparkles size={13} className="text-brand-cobalt flex-shrink-0" />
        <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider flex-shrink-0 mr-1">
          Suggestions:
        </span>
        {smartReplies.map((reply, i) => (
          <button
            key={i}
            type="button"
            onClick={() => {
              setReplyText(reply);
              setInlineMode('reply');
            }}
            className="text-xs px-2.5 py-1 bg-white hover:bg-brand-ice hover:border-brand-cobalt/50 border border-gray-200 text-gray-700 whitespace-nowrap transition-colors"
          >
            "{reply}"
          </button>
        ))}
      </div>

      {/* 5. Rich Inline Reply / Forward Composer Box */}
      <div className="p-4 border-t border-gray-200 bg-[#F8FAFC] flex-shrink-0">
        <div className="bg-white border border-gray-300 shadow-sm">
          {/* Top Mode Selector Tabs */}
          <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between text-xs">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => setInlineMode('reply')}
                className={`flex items-center gap-1.5 pb-0.5 font-semibold transition-colors ${
                  inlineMode === 'reply'
                    ? 'text-brand-cobalt border-b-2 border-brand-cobalt'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                <Reply size={13} />
                <span>Reply</span>
              </button>

              <button
                type="button"
                onClick={() => setInlineMode('replyAll')}
                className={`flex items-center gap-1.5 pb-0.5 font-semibold transition-colors ${
                  inlineMode === 'replyAll'
                    ? 'text-brand-cobalt border-b-2 border-brand-cobalt'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                <ReplyAll size={13} />
                <span>Reply All</span>
              </button>

              <button
                type="button"
                onClick={() => setInlineMode('forward')}
                className={`flex items-center gap-1.5 pb-0.5 font-semibold transition-colors ${
                  inlineMode === 'forward'
                    ? 'text-brand-cobalt border-b-2 border-brand-cobalt'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                <Forward size={13} />
                <span>Forward</span>
              </button>
            </div>

            {/* Expand to full compose modal */}
            <button
              type="button"
              onClick={() => {
                onOpenFullCompose({
                  to: message.from.email,
                  subject: `Re: ${message.subject}`,
                  body: replyText
                });
              }}
              className="text-gray-500 hover:text-brand-cobalt flex items-center gap-1 text-[11px]"
              title="Open in separate compose window"
            >
              <Maximize2 size={12} />
              <span>Full Editor</span>
            </button>
          </div>

          {/* Inline Recipients bar */}
          <div className="px-3 py-1.5 border-b border-gray-100 flex items-center justify-between text-xs text-gray-600 bg-white">
            <div className="flex items-center gap-2 truncate">
              <span className="font-semibold text-gray-500">To:</span>
              <span className="truncate">
                {inlineMode === 'forward'
                  ? 'Specify recipient in full editor or type above'
                  : inlineMode === 'replyAll'
                    ? `${message.from.name}, ${message.to.map((t) => t.name).join(', ')}`
                    : message.from.name}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setShowCc((prev) => !prev)}
              className="text-brand-cobalt hover:underline text-[11px] font-medium"
            >
              {showCc ? 'Hide Cc' : 'Add Cc'}
            </button>
          </div>

          {showCc && (
            <div className="px-3 py-1 border-b border-gray-100 flex items-center gap-2 text-xs bg-white">
              <span className="font-semibold text-gray-500">Cc:</span>
              <input
                type="text"
                value={ccInput}
                onChange={(e) => setCcInput(e.target.value)}
                placeholder="Comma separated emails..."
                className="flex-1 outline-none text-xs text-gray-800"
              />
            </div>
          )}

          {/* Formatting Mini-Toolbar */}
          <div className="px-2 py-1 bg-gray-50/70 border-b border-gray-100 flex items-center gap-0.5 text-gray-600">
            <button
              type="button"
              onClick={() => setIsFormattingActive((prev) => !prev)}
              className={`p-1 hover:bg-gray-200 rounded-none ${
                isFormattingActive ? 'bg-gray-200 text-brand-cobalt font-bold' : ''
              }`}
              title="Bold (Ctrl+B)"
            >
              <Bold size={13} />
            </button>
            <button
              type="button"
              className="p-1 hover:bg-gray-200 rounded-none"
              title="Italic (Ctrl+I)"
            >
              <Italic size={13} />
            </button>
            <button
              type="button"
              className="p-1 hover:bg-gray-200 rounded-none"
              title="Underline (Ctrl+U)"
            >
              <Underline size={13} />
            </button>
            <div className="w-px h-3.5 bg-gray-200 mx-1" />
            <button
              type="button"
              className="p-1 hover:bg-gray-200 rounded-none"
              title="Bulleted List"
            >
              <List size={13} />
            </button>
            <button
              type="button"
              className="p-1 hover:bg-gray-200 rounded-none"
              title="Numbered List"
            >
              <ListOrdered size={13} />
            </button>
            <button
              type="button"
              className="p-1 hover:bg-gray-200 rounded-none"
              title="Insert link"
            >
              <Link2 size={13} />
            </button>
            <button
              type="button"
              onClick={() => alert('Attachment dialogue opened.')}
              className="p-1 hover:bg-gray-200 rounded-none"
              title="Attach file"
            >
              <Paperclip size={13} />
            </button>
          </div>

          {/* Textarea */}
          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder={`Type your reply to ${message.from.name}...`}
            rows={3}
            className="w-full p-3 text-xs text-gray-800 placeholder-gray-400 outline-none resize-y min-h-[70px]"
          />

          {/* Footer Action Bar */}
          <div className="px-3 py-2 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSendReply}
                disabled={!replyText.trim()}
                className="px-4 py-1.5 bg-brand-cobalt hover:bg-[#004578] disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Send size={13} />
                <span>Send</span>
              </button>

              <button
                type="button"
                onClick={() => setReplyText('')}
                className="px-3 py-1.5 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-200/70 transition-colors"
              >
                Discard
              </button>
            </div>

            <span className="text-[11px] text-gray-400">
              Press Enter with Send or use Full Editor
            </span>
          </div>
        </div>
      </div>

      {/* 6. Document / Attachment Preview Modal */}
      {previewAttachment && (
        <div 
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-8 animate-in fade-in duration-100"
          onClick={() => setPreviewAttachment(null)}
        >
          <div 
            className="bg-white w-full max-w-3xl h-[80vh] flex flex-col shadow-2xl border border-gray-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-3 bg-[#005A9E] text-white flex items-center justify-between">
              <div className="flex items-center gap-2 truncate">
                <FileText size={16} />
                <span className="font-semibold text-xs truncate">
                  {previewAttachment.name}
                </span>
                <span className="text-[11px] text-blue-100">
                  ({previewAttachment.size})
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const blob = new Blob([`Outlook Document Viewer: Export of ${previewAttachment.name}\nSize: ${previewAttachment.size}`], { type: 'text/plain' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = previewAttachment.name;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-xs font-medium flex items-center gap-1 transition-colors"
                >
                  <Download size={13} />
                  <span>Download</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewAttachment(null)}
                  className="p-1 hover:bg-white/20 text-white transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Preview Document Stage */}
            <div className="flex-1 bg-gray-100 p-8 flex items-center justify-center overflow-auto">
              <div className="bg-white p-8 max-w-xl w-full shadow-md border border-gray-200 min-h-[400px] flex flex-col justify-between">
                <div>
                  <div className="border-b border-gray-200 pb-4 mb-4">
                    <h2 className="text-lg font-bold text-gray-900">
                      {previewAttachment.name}
                    </h2>
                    <p className="text-xs text-gray-400 mt-1">
                      Preview generated from Outlook Cloud Document Viewer
                    </p>
                  </div>
                  <div className="space-y-3 text-xs text-gray-600 leading-relaxed">
                    <p>
                      This is a high-fidelity document preview rendered directly within
                      the client container. All vector assets, metadata, and tables have
                      been processed.
                    </p>
                    <div className="p-4 bg-gray-50 border border-gray-200 font-mono text-[11px] text-gray-700">
                      STATUS: VERIFIED
                      <br />
                      CHECKSUM: SHA-256 ok
                      <br />
                      SIZE: {previewAttachment.size}
                      <br />
                      COMPLIANCE: Q4 Audit Ready
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-gray-100 text-center text-xs text-gray-400">
                  Page 1 of 4 • Confidential & Proprietary
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 7. Print Modal Dialog */}
      {isPrintModalOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-100"
          onClick={() => setIsPrintModalOpen(false)}
        >
          <div 
            className="bg-white w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl border border-gray-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-3 bg-gray-800 text-white flex items-center justify-between text-xs font-semibold">
              <div className="flex items-center gap-2">
                <Printer size={15} />
                <span>Print Preview — {message.subject}</span>
              </div>
              <button
                type="button"
                onClick={() => setIsPrintModalOpen(false)}
                className="p-1 hover:bg-white/20"
              >
                <X size={15} />
              </button>
            </div>

            <div className="flex-1 p-8 overflow-y-auto bg-gray-50">
              <div className="bg-white p-8 border border-gray-300 shadow-sm max-w-xl mx-auto font-sans">
                {/* Print Header */}
                <div className="border-b-2 border-gray-800 pb-3 mb-4">
                  <div className="text-xl font-bold text-gray-900 mb-2">
                    {message.subject}
                  </div>
                  <table className="text-xs text-gray-700 w-full">
                    <tbody>
                      <tr>
                        <td className="font-bold py-0.5 w-16">From:</td>
                        <td>
                          {message.from.name} &lt;{message.from.email}&gt;
                        </td>
                      </tr>
                      <tr>
                        <td className="font-bold py-0.5">Sent:</td>
                        <td>{message.date}</td>
                      </tr>
                      <tr>
                        <td className="font-bold py-0.5">To:</td>
                        <td>
                          {message.to.map((t) => `${t.name} <${t.email}>`).join('; ')}
                        </td>
                      </tr>
                      {message.cc && message.cc.length > 0 && (
                        <tr>
                          <td className="font-bold py-0.5">Cc:</td>
                          <td>
                            {message.cc
                              .map((c) => `${c.name} <${c.email}>`)
                              .join('; ')}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Print Body */}
                <div className="text-sm text-gray-800 leading-relaxed whitespace-pre-line">
                  {message.body}
                </div>
              </div>
            </div>

            <div className="p-3 bg-gray-100 border-t border-gray-300 flex items-center justify-end gap-2 text-xs">
              <button
                type="button"
                onClick={() => setIsPrintModalOpen(false)}
                className="px-4 py-1.5 border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 font-medium"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  window.print();
                  setIsPrintModalOpen(false);
                }}
                className="px-4 py-1.5 bg-brand-cobalt hover:bg-[#004578] text-white font-semibold flex items-center gap-1.5"
              >
                <Printer size={13} />
                <span>Print Document</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
