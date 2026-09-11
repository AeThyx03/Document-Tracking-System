import React, { useState } from 'react';
import { DedicatedLinkItem } from '../types';
import {
  ExternalLink,
  Plus,
  Search,
  Filter,
  Trash2,
  Edit2,
  HardDrive,
  FileText,
  Globe,
  FileSpreadsheet,
  Pin,
  FolderOpen,
  Copy,
  Check,
  ShieldCheck,
  Sparkles,
  Link as LinkIcon,
  X,
  Lock,
} from 'lucide-react';

interface DedicatedLinksViewProps {
  links: DedicatedLinkItem[];
  onAddLink: (link: Omit<DedicatedLinkItem, 'id' | 'addedAt'>) => void;
  onUpdateLink: (id: string, updates: Partial<DedicatedLinkItem>) => void;
  onDeleteLink: (id: string) => void;
  currentUserRole: string;
  currentUserName: string;
  availableDivisions: string[];
}

export const DedicatedLinksView: React.FC<DedicatedLinksViewProps> = ({
  links,
  onAddLink,
  onUpdateLink,
  onDeleteLink,
  currentUserRole,
  currentUserName,
  availableDivisions,
}) => {
  const isSysAdmin = currentUserRole === 'System Admin';

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedDivision, setSelectedDivision] = useState<string>('All');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modal State for Add / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLinkId, setEditingLinkId] = useState<string | null>(null);

  const [formTitle, setFormTitle] = useState('');
  const [formUrl, setFormUrl] = useState('');
  const [formCategory, setFormCategory] = useState<DedicatedLinkItem['category']>('Google Drive');
  const [formDescription, setFormDescription] = useState('');
  const [formDivision, setFormDivision] = useState('All Divisions');
  const [formIconType, setFormIconType] = useState<DedicatedLinkItem['iconType']>('drive');
  const [formIsPinned, setFormIsPinned] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const categories: Array<DedicatedLinkItem['category']> = [
    'Google Drive',
    'Official Files',
    'Portals & Systems',
    'Reference Guidelines',
  ];

  const handleOpenAddModal = () => {
    if (!isSysAdmin) return;
    setEditingLinkId(null);
    setFormTitle('');
    setFormUrl('');
    setFormCategory('Google Drive');
    setFormDescription('');
    setFormDivision('All Divisions');
    setFormIconType('drive');
    setFormIsPinned(false);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (link: DedicatedLinkItem) => {
    if (!isSysAdmin) return;
    setEditingLinkId(link.id);
    setFormTitle(link.title);
    setFormUrl(link.url);
    setFormCategory(link.category);
    setFormDescription(link.description || '');
    setFormDivision(link.targetDivision || 'All Divisions');
    setFormIconType(link.iconType || 'drive');
    setFormIsPinned(!!link.isPinned);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSysAdmin) return;

    if (!formTitle.trim()) {
      setFormError('Please enter a descriptive title for this link.');
      return;
    }
    if (!formUrl.trim()) {
      setFormError('Please provide a valid URL.');
      return;
    }

    let cleanUrl = formUrl.trim();
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = `https://${cleanUrl}`;
    }

    if (editingLinkId) {
      onUpdateLink(editingLinkId, {
        title: formTitle.trim(),
        url: cleanUrl,
        category: formCategory,
        description: formDescription.trim(),
        targetDivision: formDivision,
        iconType: formIconType,
        isPinned: formIsPinned,
      });
    } else {
      onAddLink({
        title: formTitle.trim(),
        url: cleanUrl,
        category: formCategory,
        description: formDescription.trim(),
        targetDivision: formDivision,
        iconType: formIconType,
        addedBy: currentUserName || 'System Admin',
        isPinned: formIsPinned,
      });
    }

    setIsModalOpen(false);
  };

  const handleCopy = (id: string, url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filter and sort links
  const filteredLinks = links
    .filter((l) => {
      const matchSearch =
        (l.title || '').toLowerCase().includes((searchQuery || '').toLowerCase()) ||
        (l.description && (l.description || '').toLowerCase().includes((searchQuery || '').toLowerCase())) ||
        (l.url || '').toLowerCase().includes((searchQuery || '').toLowerCase()) ||
        (l.targetDivision && (l.targetDivision || '').toLowerCase().includes((searchQuery || '').toLowerCase()));

      const matchCategory = selectedCategory === 'All' || l.category === selectedCategory;
      const matchDivision =
        selectedDivision === 'All' ||
        l.targetDivision === 'All Divisions' ||
        l.targetDivision === selectedDivision;

      return matchSearch && matchCategory && matchDivision;
    })
    .sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return a.title.localeCompare(b.title);
    });

  const getIcon = (type?: string, category?: string) => {
    if (type === 'drive' || category === 'Google Drive') {
      return <HardDrive className="w-5 h-5 text-sky-400" />;
    }
    if (type === 'sheet') {
      return <FileSpreadsheet className="w-5 h-5 text-emerald-400" />;
    }
    if (type === 'file' || category === 'Reference Guidelines') {
      return <FileText className="w-5 h-5 text-amber-400" />;
    }
    return <Globe className="w-5 h-5 text-indigo-400" />;
  };

  const getCategoryBadgeClass = (category: string) => {
    switch (category) {
      case 'Google Drive':
        return 'bg-sky-950/70 text-sky-300 border-sky-800/80';
      case 'Official Files':
        return 'bg-emerald-950/70 text-emerald-300 border-emerald-800/80';
      case 'Portals & Systems':
        return 'bg-purple-950/70 text-purple-300 border-purple-800/80';
      case 'Reference Guidelines':
        return 'bg-amber-950/70 text-amber-300 border-amber-800/80';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl -z-0 pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-blue-950 text-blue-300 border border-blue-800/80 flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-blue-400" />
                Institutional Directory
              </span>
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Curated by System Administration
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Dedicated Drives, Files & URLs
            </h1>
            <p className="text-sm text-slate-400 mt-1 max-w-2xl">
              Centralized repository of verified Google Drive folders, standard office templates, and external tracking systems accessible to all POSSD personnel.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {isSysAdmin ? (
              <button
                type="button"
                id="btn-add-dedicated-link"
                onClick={handleOpenAddModal}
                className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm shadow-lg shadow-blue-600/20 flex items-center gap-2 cursor-pointer transition-all active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>Add Dedicated Link</span>
              </button>
            ) : (
              <div className="px-3.5 py-2 rounded-xl bg-slate-800/80 border border-slate-700/80 text-xs text-slate-400 flex items-center gap-2">
                <Lock className="w-3.5 h-3.5 text-slate-400" />
                <span>Only System Admins can add links</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search drives, files, circulars, or web links..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
          <button
            type="button"
            onClick={() => setSelectedCategory('All')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              selectedCategory === 'All'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            All ({links.length})
          </button>
          {categories.map((cat) => {
            const count = links.filter((l) => l.category === cat).length;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {cat} ({count})
              </button>
            );
          })}
        </div>

        {/* Division Filter */}
        <div className="flex items-center gap-2 shrink-0">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={selectedDivision}
            onChange={(e) => setSelectedDivision(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
          >
            <option value="All">All Divisions</option>
            {availableDivisions.map((div) => (
              <option key={div} value={div}>
                {div}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Links Grid */}
      {filteredLinks.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center">
          <FolderOpen className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white">No dedicated links found</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            {searchQuery
              ? 'Try modifying your search keywords or clear the category filters.'
              : 'The System Administrator has not registered any links for this category yet.'}
          </p>
          {isSysAdmin && (
            <button
              onClick={handleOpenAddModal}
              className="mt-4 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold inline-flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Add First Link
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredLinks.map((link) => {
            const isCopied = copiedId === link.id;

            return (
              <div
                key={link.id}
                className="bg-slate-900 border border-slate-800 hover:border-blue-500/50 hover:-translate-y-1 rounded-2xl p-5 shadow-lg hover:shadow-2xl hover:shadow-blue-950/40 transition-all duration-200 flex flex-col justify-between group"
              >
                <div>
                  {/* Top Row: Icon, Category & Pin */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700/80 flex items-center justify-center shrink-0 group-hover:scale-110 group-hover:border-blue-500/60 transition-all duration-200">
                        {getIcon(link.iconType, link.category)}
                      </div>
                      <div>
                        <span
                          className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${getCategoryBadgeClass(
                            link.category
                          )}`}
                        >
                          {link.category}
                        </span>
                        {link.isPinned && (
                          <span className="inline-flex items-center gap-0.5 ml-1.5 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-800">
                            <Pin className="w-2.5 h-2.5 fill-amber-400" />
                            Pinned
                          </span>
                        )}
                      </div>
                    </div>

                    {isSysAdmin && (
                      <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(link)}
                          title="Edit link details (Admin)"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 hover:scale-110 active:scale-95 transition-all cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`Delete dedicated link "${link.title}"?`)) {
                              onDeleteLink(link.id);
                            }
                          }}
                          title="Delete link (Admin)"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/50 hover:scale-110 active:scale-95 transition-all cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Title & Description */}
                  <h3 className="text-base font-bold text-white group-hover:text-blue-400 transition-colors line-clamp-1">
                    {link.title}
                  </h3>
                  {link.description && (
                    <p className="text-xs text-slate-400 mt-1.5 line-clamp-2 leading-relaxed">
                      {link.description}
                    </p>
                  )}

                  {/* Target Division Badge */}
                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-[11px] font-medium text-slate-400 bg-slate-950 px-2 py-0.5 rounded-md border border-slate-800">
                      {link.targetDivision || 'All Divisions'}
                    </span>
                    <span className="text-[10.5px] text-slate-400 truncate">
                      Added by {link.addedBy}
                    </span>
                  </div>
                </div>

                {/* Bottom Actions: Open Link & Copy */}
                <div className="mt-5 pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => handleCopy(link.id, link.url)}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs flex items-center gap-1.5 transition-all duration-150 hover:scale-105 active:scale-95 cursor-pointer"
                    title="Copy direct URL to clipboard"
                  >
                    {isCopied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>

                  <a
                    href={link.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-all duration-150 hover:scale-[1.02] active:scale-[0.98] shadow-md shadow-blue-900/30 hover:shadow-lg hover:shadow-blue-600/30"
                  >
                    <span>Launch Link</span>
                    <ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Admin Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl p-6 relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <LinkIcon className="w-5 h-5 text-blue-400" />
                {editingLinkId ? 'Edit Dedicated Link' : 'Add New Dedicated Link'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-3 mb-4 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleSaveForm} className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Resource Title *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Master Operations Google Drive"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* URL */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  URL / Drive Link *
                </label>
                <input
                  type="text"
                  placeholder="https://drive.google.com/drive/folders/..."
                  value={formUrl}
                  onChange={(e) => setFormUrl(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500 font-mono text-xs"
                />
              </div>

              {/* Category & Icon */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Category
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Visual Icon
                  </label>
                  <select
                    value={formIconType}
                    onChange={(e) => setFormIconType(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="drive">Google Drive (Storage)</option>
                    <option value="sheet">Google Sheet (Table)</option>
                    <option value="file">Document / PDF</option>
                    <option value="link">Web Portal / System</option>
                  </select>
                </div>
              </div>

              {/* Target Division */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Target Office / Division
                </label>
                <select
                  value={formDivision}
                  onChange={(e) => setFormDivision(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="All Divisions">All Divisions (Public)</option>
                  {availableDivisions.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Description / Instructions (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Provide guidance on what is stored in this drive or file..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>

              {/* Pin to top */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="formIsPinned"
                  checked={formIsPinned}
                  onChange={(e) => setFormIsPinned(e.target.checked)}
                  className="w-4 h-4 rounded bg-slate-950 border-slate-700 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="formIsPinned" className="text-xs font-semibold text-slate-300">
                  Pin to top of directory
                </label>
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/30 transition-all"
                >
                  {editingLinkId ? 'Save Changes' : 'Create Link'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
