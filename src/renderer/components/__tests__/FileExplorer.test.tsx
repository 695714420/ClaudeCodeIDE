import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { FileExplorer, FileExplorerProps } from '../FileExplorer'
import type { FileTreeNode } from '../../../shared/types'
import { getFileIcon } from '../../utils/fileIcons'

const mockFileTree: FileTreeNode[] = [
  {
    name: 'src',
    path: '/project/src',
    type: 'directory',
    children: [
      { name: 'index.ts', path: '/project/src/index.ts', type: 'file' },
      {
        name: 'utils',
        path: '/project/src/utils',
        type: 'directory',
        children: [
          { name: 'helper.ts', path: '/project/src/utils/helper.ts', type: 'file' }
        ]
      }
    ]
  },
  { name: 'README.md', path: '/project/README.md', type: 'file' },
  { name: 'package.json', path: '/project/package.json', type: 'file' }
]

function renderFileExplorer(overrides: Partial<FileExplorerProps> = {}) {
  const defaultProps: FileExplorerProps = {
    rootPath: '/project',
    fileTree: mockFileTree,
    onFileSelect: jest.fn(),
    onFileCreate: jest.fn(),
    onFolderCreate: jest.fn(),
    onFileDelete: jest.fn(),
    onFileRename: jest.fn(),
    ...overrides
  }

  render(<FileExplorer {...defaultProps} />)
  return defaultProps
}

describe('FileExplorer Component', () => {
  describe('Rendering (Req 2.1)', () => {
    it('should render the file explorer container', () => {
      renderFileExplorer()
      expect(screen.getByTestId('file-explorer')).toBeInTheDocument()
    })

    it('should render the toolbar with New File and New Folder buttons (Req 2.4)', () => {
      renderFileExplorer()
      expect(screen.getByTestId('file-explorer-toolbar')).toBeInTheDocument()
      expect(screen.getByTestId('btn-new-file')).toBeInTheDocument()
      expect(screen.getByTestId('btn-new-folder')).toBeInTheDocument()
    })

    it('should render top-level file tree nodes', () => {
      renderFileExplorer()
      expect(screen.getByTestId('file-node-src')).toBeInTheDocument()
      expect(screen.getByTestId('file-node-README.md')).toBeInTheDocument()
      expect(screen.getByTestId('file-node-package.json')).toBeInTheDocument()
    })

    it('should have correct ARIA attributes', () => {
      renderFileExplorer()
      const explorer = screen.getByTestId('file-explorer')
      expect(explorer).toHaveAttribute('role', 'tree')
      expect(explorer).toHaveAttribute('aria-label', 'File explorer')
    })

    it('should show directory nodes with collapse arrow', () => {
      renderFileExplorer()
      expect(screen.getByTestId('arrow-src')).toHaveTextContent('▶')
    })

    it('should not show children of collapsed directories', () => {
      renderFileExplorer()
      expect(screen.queryByTestId('file-node-index.ts')).not.toBeInTheDocument()
    })
  })

  describe('Expand/Collapse (Req 2.1)', () => {
    it('should expand a directory when clicked', () => {
      renderFileExplorer()
      fireEvent.click(screen.getByTestId('file-node-row-src'))
      expect(screen.getByTestId('arrow-src')).toHaveTextContent('▼')
      expect(screen.getByTestId('file-node-index.ts')).toBeInTheDocument()
      expect(screen.getByTestId('file-node-utils')).toBeInTheDocument()
    })

    it('should collapse an expanded directory when clicked again', () => {
      renderFileExplorer()
      fireEvent.click(screen.getByTestId('file-node-row-src'))
      expect(screen.getByTestId('file-node-index.ts')).toBeInTheDocument()
      fireEvent.click(screen.getByTestId('file-node-row-src'))
      expect(screen.queryByTestId('file-node-index.ts')).not.toBeInTheDocument()
    })

    it('should support nested directory expansion', () => {
      renderFileExplorer()
      fireEvent.click(screen.getByTestId('file-node-row-src'))
      fireEvent.click(screen.getByTestId('file-node-row-utils'))
      expect(screen.getByTestId('file-node-helper.ts')).toBeInTheDocument()
    })
  })

  describe('File Selection (Req 2.3)', () => {
    it('should call onFileSelect when a file node is clicked', () => {
      const props = renderFileExplorer()
      fireEvent.click(screen.getByTestId('file-node-row-README.md'))
      expect(props.onFileSelect).toHaveBeenCalledWith('/project/README.md')
    })

    it('should call onFileSelect for nested files after expanding', () => {
      const props = renderFileExplorer()
      fireEvent.click(screen.getByTestId('file-node-row-src'))
      fireEvent.click(screen.getByTestId('file-node-row-index.ts'))
      expect(props.onFileSelect).toHaveBeenCalledWith('/project/src/index.ts')
    })

    it('should not call onFileSelect when a directory is clicked', () => {
      const props = renderFileExplorer()
      fireEvent.click(screen.getByTestId('file-node-row-src'))
      expect(props.onFileSelect).not.toHaveBeenCalled()
    })
  })

  describe('Toolbar Actions (Req 2.4)', () => {
    it('should show inline input when New File button is clicked', () => {
      renderFileExplorer()
      fireEvent.click(screen.getByTestId('btn-new-file'))
      expect(screen.getByTestId('inline-name-input')).toBeInTheDocument()
    })

    it('should show inline input when New Folder button is clicked', () => {
      renderFileExplorer()
      fireEvent.click(screen.getByTestId('btn-new-folder'))
      expect(screen.getByTestId('inline-name-input')).toBeInTheDocument()
    })

    it('should call onFileCreate when submitting new file name via Enter', () => {
      const props = renderFileExplorer()
      fireEvent.click(screen.getByTestId('btn-new-file'))
      const input = screen.getByTestId('inline-name-input')
      fireEvent.change(input, { target: { value: 'newfile.ts' } })
      fireEvent.keyDown(input, { key: 'Enter' })
      expect(props.onFileCreate).toHaveBeenCalledWith('/project', 'newfile.ts')
    })

    it('should call onFolderCreate when submitting new folder name via Enter', () => {
      const props = renderFileExplorer()
      fireEvent.click(screen.getByTestId('btn-new-folder'))
      const input = screen.getByTestId('inline-name-input')
      fireEvent.change(input, { target: { value: 'newfolder' } })
      fireEvent.keyDown(input, { key: 'Enter' })
      expect(props.onFolderCreate).toHaveBeenCalledWith('/project', 'newfolder')
    })

    it('should dismiss inline input on Escape', () => {
      renderFileExplorer()
      fireEvent.click(screen.getByTestId('btn-new-file'))
      const input = screen.getByTestId('inline-name-input')
      fireEvent.keyDown(input, { key: 'Escape' })
      expect(screen.queryByTestId('inline-name-input')).not.toBeInTheDocument()
    })

    it('should not call onFileCreate for empty name', () => {
      const props = renderFileExplorer()
      fireEvent.click(screen.getByTestId('btn-new-file'))
      const input = screen.getByTestId('inline-name-input')
      fireEvent.change(input, { target: { value: '' } })
      fireEvent.keyDown(input, { key: 'Enter' })
      expect(props.onFileCreate).not.toHaveBeenCalled()
    })
  })

  describe('Context Menu (Req 2.2)', () => {
    it('should show context menu on right-click of a node', () => {
      renderFileExplorer()
      fireEvent.contextMenu(screen.getByTestId('file-node-row-README.md'))
      expect(screen.getByTestId('context-menu')).toBeInTheDocument()
      expect(screen.getByTestId('context-menu-new-file')).toBeInTheDocument()
      expect(screen.getByTestId('context-menu-new-folder')).toBeInTheDocument()
      expect(screen.getByTestId('context-menu-rename')).toBeInTheDocument()
      expect(screen.getByTestId('context-menu-delete')).toBeInTheDocument()
    })

    it('should call onFileDelete when Delete is clicked in context menu', () => {
      const props = renderFileExplorer()
      fireEvent.contextMenu(screen.getByTestId('file-node-row-README.md'))
      fireEvent.click(screen.getByTestId('context-menu-delete'))
      expect(props.onFileDelete).toHaveBeenCalledWith('/project/README.md')
    })

    it('should show rename input when Rename is clicked in context menu', () => {
      renderFileExplorer()
      fireEvent.contextMenu(screen.getByTestId('file-node-row-README.md'))
      fireEvent.click(screen.getByTestId('context-menu-rename'))
      expect(screen.getByTestId('inline-name-input')).toBeInTheDocument()
    })

    it('should call onFileRename when rename is submitted', () => {
      const props = renderFileExplorer()
      fireEvent.contextMenu(screen.getByTestId('file-node-row-README.md'))
      fireEvent.click(screen.getByTestId('context-menu-rename'))
      const input = screen.getByTestId('inline-name-input')
      fireEvent.change(input, { target: { value: 'CHANGELOG.md' } })
      fireEvent.keyDown(input, { key: 'Enter' })
      expect(props.onFileRename).toHaveBeenCalledWith('/project/README.md', 'CHANGELOG.md')
    })

    it('should not call onFileRename if name is unchanged', () => {
      const props = renderFileExplorer()
      fireEvent.contextMenu(screen.getByTestId('file-node-row-README.md'))
      fireEvent.click(screen.getByTestId('context-menu-rename'))
      const input = screen.getByTestId('inline-name-input')
      fireEvent.keyDown(input, { key: 'Enter' })
      expect(props.onFileRename).not.toHaveBeenCalled()
    })

    it('should close context menu when clicking outside', () => {
      renderFileExplorer()
      fireEvent.contextMenu(screen.getByTestId('file-node-row-README.md'))
      expect(screen.getByTestId('context-menu')).toBeInTheDocument()
      fireEvent.mouseDown(document)
      expect(screen.queryByTestId('context-menu')).not.toBeInTheDocument()
    })
  })

  describe('Empty Tree', () => {
    it('should render with an empty file tree', () => {
      renderFileExplorer({ fileTree: [] })
      expect(screen.getByTestId('file-explorer')).toBeInTheDocument()
      expect(screen.getByTestId('file-explorer-tree')).toBeInTheDocument()
    })
  })

  describe('Git Status Indicators (Req P1-5)', () => {
    it('should show M indicator for modified files', () => {
      renderFileExplorer({
        gitStatuses: { '/project/README.md': 'modified' }
      })
      const indicator = screen.getByTestId('git-status-M')
      expect(indicator).toBeInTheDocument()
      expect(indicator).toHaveTextContent('M')
      expect(indicator).toHaveClass('git-status-modified')
    })

    it('should show A indicator for added files', () => {
      renderFileExplorer({
        gitStatuses: { '/project/README.md': 'added' }
      })
      const indicator = screen.getByTestId('git-status-A')
      expect(indicator).toBeInTheDocument()
      expect(indicator).toHaveTextContent('A')
      expect(indicator).toHaveClass('git-status-added')
    })

    it('should show D indicator for deleted files', () => {
      renderFileExplorer({
        gitStatuses: { '/project/README.md': 'deleted' }
      })
      const indicator = screen.getByTestId('git-status-D')
      expect(indicator).toBeInTheDocument()
      expect(indicator).toHaveTextContent('D')
      expect(indicator).toHaveClass('git-status-deleted')
    })

    it('should show U indicator for untracked files', () => {
      renderFileExplorer({
        gitStatuses: { '/project/README.md': 'untracked' }
      })
      const indicator = screen.getByTestId('git-status-U')
      expect(indicator).toBeInTheDocument()
      expect(indicator).toHaveTextContent('U')
      expect(indicator).toHaveClass('git-status-untracked')
    })

    it('should not show indicator for files without git status', () => {
      renderFileExplorer({ gitStatuses: {} })
      expect(screen.queryByTestId('git-status-M')).not.toBeInTheDocument()
      expect(screen.queryByTestId('git-status-A')).not.toBeInTheDocument()
      expect(screen.queryByTestId('git-status-D')).not.toBeInTheDocument()
      expect(screen.queryByTestId('git-status-U')).not.toBeInTheDocument()
    })
  })

  describe('File Icons (Task 12.1, 12.2)', () => {
    it('should return correct icon for TypeScript files', () => {
      expect(getFileIcon('index.ts')).toBe('🔷')
      expect(getFileIcon('App.tsx')).toBe('🔷')
    })

    it('should return correct icon for JavaScript files', () => {
      expect(getFileIcon('main.js')).toBe('🟡')
      expect(getFileIcon('App.jsx')).toBe('🟡')
    })

    it('should return correct icon for Python files', () => {
      expect(getFileIcon('script.py')).toBe('🐍')
    })

    it('should return correct icon for JSON files', () => {
      expect(getFileIcon('data.json')).toBe('📋')
    })

    it('should return correct icon for Markdown files', () => {
      expect(getFileIcon('README.md')).toBe('📝')
    })

    it('should return correct icon for CSS files', () => {
      expect(getFileIcon('styles.css')).toBe('🎨')
    })

    it('should return default icon for unknown extensions', () => {
      expect(getFileIcon('file.xyz')).toBe('📄')
    })

    it('should match special filenames like Dockerfile', () => {
      expect(getFileIcon('Dockerfile')).toBe('🐳')
    })

    it('should match package.json by filename', () => {
      expect(getFileIcon('package.json')).toBe('📦')
    })

    it('should display file-type icon in the tree for .md files', () => {
      renderFileExplorer()
      // README.md should show 📝 icon
      const readmeRow = screen.getByTestId('file-node-row-README.md')
      expect(readmeRow.querySelector('.file-icon')).toHaveTextContent('📝')
    })

    it('should display file-type icon in the tree for .json files', () => {
      renderFileExplorer()
      const jsonRow = screen.getByTestId('file-node-row-package.json')
      expect(jsonRow.querySelector('.file-icon')).toHaveTextContent('📦')
    })
  })

  describe('File Filter (Task 12.3)', () => {
    it('should render the filter input', () => {
      renderFileExplorer()
      expect(screen.getByTestId('file-filter-input')).toBeInTheDocument()
    })

    it('should filter files by name when typing', () => {
      renderFileExplorer()
      const filterInput = screen.getByTestId('file-filter-input')
      fireEvent.change(filterInput, { target: { value: 'README' } })
      expect(screen.getByTestId('file-node-README.md')).toBeInTheDocument()
      expect(screen.queryByTestId('file-node-package.json')).not.toBeInTheDocument()
    })

    it('should show all nodes when filter is empty', () => {
      renderFileExplorer()
      const filterInput = screen.getByTestId('file-filter-input')
      fireEvent.change(filterInput, { target: { value: '' } })
      expect(screen.getByTestId('file-node-src')).toBeInTheDocument()
      expect(screen.getByTestId('file-node-README.md')).toBeInTheDocument()
      expect(screen.getByTestId('file-node-package.json')).toBeInTheDocument()
    })

    it('should show parent directory when a child matches the filter', () => {
      renderFileExplorer()
      // Expand src first so children are visible
      fireEvent.click(screen.getByTestId('file-node-row-src'))
      const filterInput = screen.getByTestId('file-filter-input')
      fireEvent.change(filterInput, { target: { value: 'index' } })
      // src directory should still be visible because it contains index.ts
      expect(screen.getByTestId('file-node-src')).toBeInTheDocument()
    })

    it('should be case-insensitive', () => {
      renderFileExplorer()
      const filterInput = screen.getByTestId('file-filter-input')
      fireEvent.change(filterInput, { target: { value: 'readme' } })
      expect(screen.getByTestId('file-node-README.md')).toBeInTheDocument()
    })
  })

  describe('Drag and Drop (Task 12.4)', () => {
    it('should set draggable attribute on file nodes', () => {
      renderFileExplorer()
      const readmeRow = screen.getByTestId('file-node-row-README.md')
      expect(readmeRow).toHaveAttribute('draggable', 'true')
    })

    it('should set draggable attribute on directory nodes', () => {
      renderFileExplorer()
      const srcRow = screen.getByTestId('file-node-row-src')
      expect(srcRow).toHaveAttribute('draggable', 'true')
    })

    it('should add drag-over class when dragging over a directory', () => {
      renderFileExplorer()
      const srcRow = screen.getByTestId('file-node-row-src')
      fireEvent.dragOver(srcRow, {
        dataTransfer: { getData: () => '/project/README.md', dropEffect: 'move' },
        preventDefault: jest.fn()
      })
      expect(srcRow).toHaveClass('drag-over')
    })

    it('should remove drag-over class on drag leave', () => {
      renderFileExplorer()
      const srcRow = screen.getByTestId('file-node-row-src')
      fireEvent.dragOver(srcRow, {
        dataTransfer: { getData: () => '/project/README.md', dropEffect: 'move' },
        preventDefault: jest.fn()
      })
      fireEvent.dragLeave(srcRow)
      expect(srcRow).not.toHaveClass('drag-over')
    })

    it('should call onFileRename when dropping a file onto a directory', () => {
      const props = renderFileExplorer()
      const srcRow = screen.getByTestId('file-node-row-src')
      fireEvent.drop(srcRow, {
        dataTransfer: { getData: () => '/project/README.md' },
        preventDefault: jest.fn()
      })
      expect(props.onFileRename).toHaveBeenCalledWith(
        '/project/README.md',
        '/project/src/README.md'
      )
    })
  })
})
