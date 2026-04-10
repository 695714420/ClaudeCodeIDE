import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { ChevronRight, ChevronDown, FilePlus, FolderPlus, RefreshCw } from 'lucide-react'
import type { FileTreeNode } from '../../shared/types'
import { showToast } from './Toast'
import { t } from '../i18n'
import type { Lang } from '../i18n'
import { getFileIcon } from '../utils/fileIcons'
import './FileExplorer.css'

export interface FileExplorerProps {
  rootPath: string
  fileTree: FileTreeNode[]
  onFileSelect: (filePath: string) => void
  onFileCreate: (parentPath: string, name: string) => void
  onFolderCreate: (parentPath: string, name: string) => void
  onFileDelete: (filePath: string) => void
  onFileRename: (oldPath: string, newName: string) => void
  onLoadChildren?: (dirPath: string) => Promise<FileTreeNode[]>
  gitStatuses?: Record<string, string>
  lang?: Lang
}

interface InlineInput {
  parentPath: string
  type: 'file' | 'folder'
}

interface RenameInput {
  path: string
  currentName: string
}

interface ContextMenuState {
  x: number
  y: number
  node: FileTreeNode
}

export function FileExplorer({
  rootPath,
  fileTree,
  onFileSelect,
  onFileCreate,
  onFolderCreate,
  onFileDelete,
  onFileRename,
  onLoadChildren,
  gitStatuses = {},
  lang = 'en'
}: FileExplorerProps): JSX.Element {
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set())
  const [loadingDirs, setLoadingDirs] = useState<Set<string>>(new Set())
  const [lazyChildren, setLazyChildren] = useState<Record<string, FileTreeNode[]>>({})
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)
  const [inlineInput, setInlineInput] = useState<InlineInput | null>(null)
  const [renameInput, setRenameInput] = useState<RenameInput | null>(null)
  const [filterText, setFilterText] = useState('')
  const [dragOverPath, setDragOverPath] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const toggleDir = useCallback(
    async (dirPath: string) => {
      setExpandedDirs((prev) => {
        const next = new Set(prev)
        if (next.has(dirPath)) {
          next.delete(dirPath)
          return next
        }
        next.add(dirPath)
        return next
      })

      // Lazy load children if not already loaded
      if (!lazyChildren[dirPath] && onLoadChildren) {
        setLoadingDirs((prev) => new Set(prev).add(dirPath))
        try {
          const children = await onLoadChildren(dirPath)
          setLazyChildren((prev) => ({ ...prev, [dirPath]: children }))
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          showToast('error', t('fileError.loadChildrenFailed', lang, msg))
        } finally {
          setLoadingDirs((prev) => {
            const next = new Set(prev)
            next.delete(dirPath)
            return next
          })
        }
      }
    },
    [lazyChildren, onLoadChildren, lang]
  )

  const handleNodeClick = useCallback(
    (node: FileTreeNode) => {
      if (node.type === 'directory') {
        toggleDir(node.path)
      } else {
        onFileSelect(node.path)
      }
    },
    [toggleDir, onFileSelect]
  )

  const handleContextMenu = useCallback((e: React.MouseEvent, node: FileTreeNode) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({ x: e.clientX, y: e.clientY, node })
  }, [])

  const handleNewFile = useCallback(() => {
    setInlineInput({ parentPath: rootPath, type: 'file' })
  }, [rootPath])

  const handleNewFolder = useCallback(() => {
    setInlineInput({ parentPath: rootPath, type: 'folder' })
  }, [rootPath])

  const handleContextNewFile = useCallback(() => {
    if (!contextMenu) return
    const parentPath = contextMenu.node.type === 'directory' ? contextMenu.node.path : rootPath
    setInlineInput({ parentPath, type: 'file' })
    if (contextMenu.node.type === 'directory') {
      setExpandedDirs((prev) => new Set(prev).add(parentPath))
    }
    setContextMenu(null)
  }, [contextMenu, rootPath])

  const handleContextNewFolder = useCallback(() => {
    if (!contextMenu) return
    const parentPath = contextMenu.node.type === 'directory' ? contextMenu.node.path : rootPath
    setInlineInput({ parentPath, type: 'folder' })
    if (contextMenu.node.type === 'directory') {
      setExpandedDirs((prev) => new Set(prev).add(parentPath))
    }
    setContextMenu(null)
  }, [contextMenu, rootPath])

  const handleContextDelete = useCallback(() => {
    if (!contextMenu) return
    onFileDelete(contextMenu.node.path)
    setContextMenu(null)
  }, [contextMenu, onFileDelete])

  const handleContextRename = useCallback(() => {
    if (!contextMenu) return
    setRenameInput({ path: contextMenu.node.path, currentName: contextMenu.node.name })
    setContextMenu(null)
  }, [contextMenu])

  const handleInlineInputSubmit = useCallback(
    (name: string) => {
      if (!inlineInput || !name.trim()) {
        setInlineInput(null)
        return
      }
      if (inlineInput.type === 'file') {
        onFileCreate(inlineInput.parentPath, name.trim())
      } else {
        onFolderCreate(inlineInput.parentPath, name.trim())
      }
      setInlineInput(null)
    },
    [inlineInput, onFileCreate, onFolderCreate]
  )

  const handleRenameSubmit = useCallback(
    (newName: string) => {
      if (!renameInput || !newName.trim() || newName.trim() === renameInput.currentName) {
        setRenameInput(null)
        return
      }
      onFileRename(renameInput.path, newName.trim())
      setRenameInput(null)
    },
    [renameInput, onFileRename]
  )

  // Close context menu on outside click
  useEffect(() => {
    if (!contextMenu) return
    const handleClick = (): void => {
      setContextMenu(null)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [contextMenu])

  // Filter tree nodes recursively
  const filterTree = useCallback(
    (nodes: FileTreeNode[], query: string): FileTreeNode[] => {
      if (!query) return nodes
      const lowerQuery = query.toLowerCase()
      return nodes.reduce<FileTreeNode[]>((acc, node) => {
        if (node.type === 'file') {
          if (node.name.toLowerCase().includes(lowerQuery)) {
            acc.push(node)
          }
        } else {
          const children = node.children ? filterTree(node.children, query) : []
          const lazyKids = lazyChildren[node.path]
          const filteredLazy = lazyKids ? filterTree(lazyKids, query) : []
          const allFiltered = children.length > 0 ? children : filteredLazy
          if (node.name.toLowerCase().includes(lowerQuery) || allFiltered.length > 0) {
            acc.push({ ...node, children: allFiltered.length > 0 ? allFiltered : node.children })
          }
        }
        return acc
      }, [])
    },
    [lazyChildren]
  )

  const filteredFileTree = useMemo(
    () => filterTree(fileTree, filterText),
    [fileTree, filterText, filterTree]
  )

  // Drag and drop handlers
  const handleDragStart = useCallback((e: React.DragEvent, node: FileTreeNode) => {
    e.dataTransfer.setData('text/plain', node.path)
    e.dataTransfer.effectAllowed = 'move'
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent, node: FileTreeNode) => {
    if (node.type !== 'directory') return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverPath(node.path)
  }, [])

  const handleDragLeave = useCallback(() => {
    setDragOverPath(null)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent, targetNode: FileTreeNode) => {
      e.preventDefault()
      setDragOverPath(null)
      if (targetNode.type !== 'directory') return
      const sourcePath = e.dataTransfer.getData('text/plain')
      if (!sourcePath || sourcePath === targetNode.path) return
      // Don't drop into itself or its own parent
      if (targetNode.path.startsWith(sourcePath + '/')) return
      // Extract filename from source path
      const parts = sourcePath.replace(/\\/g, '/').split('/')
      const fileName = parts[parts.length - 1]
      const newPath = targetNode.path.replace(/\\/g, '/') + '/' + fileName
      onFileRename(sourcePath, newPath)
    },
    [onFileRename]
  )

  const renderInlineInput = (
    onSubmit: (value: string) => void,
    defaultValue?: string
  ): JSX.Element => {
    return (
      <InlineNameInput
        defaultValue={defaultValue || ''}
        onSubmit={onSubmit}
        onCancel={() => {
          setInlineInput(null)
          setRenameInput(null)
        }}
        lang={lang}
      />
    )
  }

  const getNodeChildren = (node: FileTreeNode): FileTreeNode[] | undefined => {
    // Prefer lazy-loaded children, fall back to prop-provided children
    return lazyChildren[node.path] ?? node.children
  }

  const getGitStatusIndicator = (filePath: string): JSX.Element | null => {
    const status = gitStatuses[filePath]
    if (!status) return null
    let label: string
    let className: string
    switch (status) {
      case 'modified':
        label = 'M'
        className = 'git-status-modified'
        break
      case 'added':
        label = 'A'
        className = 'git-status-added'
        break
      case 'deleted':
        label = 'D'
        className = 'git-status-deleted'
        break
      case 'untracked':
        label = 'U'
        className = 'git-status-untracked'
        break
      default:
        return null
    }
    return (
      <span className={`git-status-indicator ${className}`} data-testid={`git-status-${label}`}>
        {label}
      </span>
    )
  }

  const renderNode = (node: FileTreeNode, depth: number): JSX.Element => {
    const isExpanded = expandedDirs.has(node.path)
    const isLoading = loadingDirs.has(node.path)
    const isDir = node.type === 'directory'
    const isRenaming = renameInput?.path === node.path
    const children = isDir ? getNodeChildren(node) : undefined
    const isDragOver = dragOverPath === node.path

    return (
      <div key={node.path} data-testid={`file-node-${node.name}`}>
        <div
          className={`file-explorer-node${isDir ? ' directory' : ' file'}${isDragOver ? ' drag-over' : ''}`}
          style={{ paddingLeft: depth * 16 + 8 }}
          onClick={() => !isRenaming && handleNodeClick(node)}
          onContextMenu={(e) => handleContextMenu(e, node)}
          draggable={!isRenaming}
          onDragStart={(e) => handleDragStart(e, node)}
          onDragOver={(e) => handleDragOver(e, node)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, node)}
          data-testid={`file-node-row-${node.name}`}
          role="treeitem"
          aria-expanded={isDir ? isExpanded : undefined}
          aria-label={node.name}
        >
          {isDir && (
            <span className="file-explorer-arrow" data-testid={`arrow-${node.name}`}>
              {isLoading ? '⏳' : isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            </span>
          )}
          <span className={`file-explorer-icon ${isDir ? 'folder-icon' : 'file-icon'}`}>
            {isDir ? (isExpanded ? '📂' : '📁') : getFileIcon(node.name)}
          </span>
          {isRenaming ? (
            renderInlineInput(handleRenameSubmit, renameInput!.currentName)
          ) : (
            <>
              <span className="file-explorer-name" data-testid={`file-name-${node.name}`}>
                {node.name}
              </span>
              {getGitStatusIndicator(node.path)}
            </>
          )}
        </div>
        {isDir && isExpanded && (
          <div data-testid={`children-${node.name}`} role="group">
            {inlineInput && inlineInput.parentPath === node.path && (
              <div
                className="file-explorer-node file"
                style={{ paddingLeft: (depth + 1) * 16 + 8 }}
                data-testid="inline-input-row"
              >
                <span className="file-explorer-icon file-icon">
                  {inlineInput.type === 'folder' ? '📁' : '📄'}
                </span>
                {renderInlineInput(handleInlineInputSubmit)}
              </div>
            )}
            {children?.map((child) => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      className="file-explorer"
      ref={containerRef}
      data-testid="file-explorer"
      role="tree"
      aria-label="File explorer"
    >
      {/* Action bar */}
      <div className="file-explorer-toolbar" data-testid="file-explorer-toolbar">
        <button
          className="file-explorer-toolbar-btn"
          onClick={handleNewFile}
          data-testid="btn-new-file"
          title={t('explorer.newFile', lang)}
          aria-label={t('explorer.newFile', lang)}
        >
          <FilePlus size={14} />
        </button>
        <button
          className="file-explorer-toolbar-btn"
          onClick={handleNewFolder}
          data-testid="btn-new-folder"
          title={t('explorer.newFolder', lang)}
          aria-label={t('explorer.newFolder', lang)}
        >
          <FolderPlus size={14} />
        </button>
      </div>

      {/* Filter input */}
      <div className="file-explorer-filter" data-testid="file-explorer-filter">
        <input
          type="text"
          className="file-explorer-filter-input"
          placeholder={t('explorer.filterPlaceholder', lang)}
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
          data-testid="file-filter-input"
          aria-label={t('explorer.filterPlaceholder', lang)}
        />
      </div>

      {/* File tree */}
      <div className="file-explorer-tree" data-testid="file-explorer-tree">
        {inlineInput && inlineInput.parentPath === rootPath && (
          <div
            className="file-explorer-node file"
            style={{ paddingLeft: 8 }}
            data-testid="inline-input-row"
          >
            <span className="file-explorer-icon file-icon">
              {inlineInput.type === 'folder' ? '📁' : '📄'}
            </span>
            {renderInlineInput(handleInlineInputSubmit)}
          </div>
        )}
        {filteredFileTree.map((node) => renderNode(node, 0))}
      </div>

      {/* Context menu */}
      {contextMenu && (
        <div
          className="file-explorer-context-menu"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          data-testid="context-menu"
          role="menu"
        >
          <button
            className="context-menu-item"
            onClick={handleContextNewFile}
            data-testid="context-menu-new-file"
            role="menuitem"
          >
            {t('explorer.newFile', lang)}
          </button>
          <button
            className="context-menu-item"
            onClick={handleContextNewFolder}
            data-testid="context-menu-new-folder"
            role="menuitem"
          >
            {t('explorer.newFolder', lang)}
          </button>
          <button
            className="context-menu-item"
            onClick={handleContextRename}
            data-testid="context-menu-rename"
            role="menuitem"
          >
            {t('explorer.rename', lang)}
          </button>
          <button
            className="context-menu-item danger"
            onClick={handleContextDelete}
            data-testid="context-menu-delete"
            role="menuitem"
          >
            {t('explorer.delete', lang)}
          </button>
        </div>
      )}
    </div>
  )
}

// --- Inline Name Input sub-component ---

interface InlineNameInputProps {
  defaultValue: string
  onSubmit: (value: string) => void
  onCancel: () => void
  lang: Lang
}

function InlineNameInput({ defaultValue, onSubmit, onCancel, lang }: InlineNameInputProps): JSX.Element {
  const inputRef = useRef<HTMLInputElement>(null)
  const [value, setValue] = useState(defaultValue)

  useEffect(() => {
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter') {
      onSubmit(value)
    } else if (e.key === 'Escape') {
      onCancel()
    }
  }

  return (
    <input
      ref={inputRef}
      className="file-explorer-inline-input"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={() => onSubmit(value)}
      data-testid="inline-name-input"
      aria-label={t('explorer.enterName', lang)}
    />
  )
}
