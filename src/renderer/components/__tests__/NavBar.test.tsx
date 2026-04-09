import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { NavBar, NavBarProps } from '../NavBar'
import { AppProvider } from '../../store/AppContext'

// Mock window.electronAPI
const mockNewWindow = jest.fn().mockResolvedValue(undefined)
Object.defineProperty(window, 'electronAPI', {
  value: { newWindow: mockNewWindow },
  writable: true
})

function renderNavBar(overrides: Partial<NavBarProps> = {}): {
  onFileAction: jest.Mock
  onEditAction: jest.Mock
  onViewAction: jest.Mock
} {
  const onFileAction = jest.fn()
  const onEditAction = jest.fn()
  const onViewAction = jest.fn()

  render(
    <AppProvider>
      <NavBar
        onFileAction={overrides.onFileAction ?? onFileAction}
        onEditAction={overrides.onEditAction ?? onEditAction}
        onViewAction={overrides.onViewAction ?? onViewAction}
      />
    </AppProvider>
  )

  return { onFileAction, onEditAction, onViewAction }
}

describe('NavBar Component', () => {
  beforeEach(() => {
    mockNewWindow.mockClear()
  })

  describe('Rendering', () => {
    it('should render the navigation bar', () => {
      renderNavBar()
      expect(screen.getByTestId('navbar')).toBeInTheDocument()
    })

    it('should render File, View, Settings menu triggers', () => {
      renderNavBar()
      expect(screen.getByTestId('navbar-trigger-file')).toHaveTextContent('File')
      expect(screen.getByTestId('navbar-trigger-view')).toHaveTextContent('View')
      expect(screen.getByTestId('navbar-trigger-settings')).toHaveTextContent('Settings')
    })

    it('should have correct ARIA attributes on the nav element', () => {
      renderNavBar()
      const nav = screen.getByTestId('navbar')
      expect(nav).toHaveAttribute('role', 'menubar')
      expect(nav).toHaveAttribute('aria-label', 'Main navigation')
    })

    it('should not show any dropdown by default', () => {
      renderNavBar()
      expect(screen.queryByTestId('navbar-dropdown-file')).not.toBeInTheDocument()
      expect(screen.queryByTestId('navbar-dropdown-view')).not.toBeInTheDocument()
      expect(screen.queryByTestId('navbar-dropdown-settings')).not.toBeInTheDocument()
    })
  })

  describe('File Menu', () => {
    it('should open File dropdown on click', () => {
      renderNavBar()
      fireEvent.click(screen.getByTestId('navbar-trigger-file'))
      expect(screen.getByTestId('navbar-dropdown-file')).toBeInTheDocument()
    })

    it('should show New, Open Folder, Save, and New Window items', () => {
      renderNavBar()
      fireEvent.click(screen.getByTestId('navbar-trigger-file'))
      expect(screen.getByTestId('navbar-item-new')).toHaveTextContent('New')
      expect(screen.getByTestId('navbar-item-open-folder')).toHaveTextContent('Open Folder')
      expect(screen.getByTestId('navbar-item-save')).toHaveTextContent('Save')
      expect(screen.getByTestId('navbar-item-new-window')).toHaveTextContent('New Window')
    })

    it('should call onFileAction("new") when New is clicked', () => {
      const { onFileAction } = renderNavBar()
      fireEvent.click(screen.getByTestId('navbar-trigger-file'))
      fireEvent.click(screen.getByTestId('navbar-item-new'))
      expect(onFileAction).toHaveBeenCalledWith('new')
    })

    it('should call onFileAction("open") when Open Folder is clicked', () => {
      const { onFileAction } = renderNavBar()
      fireEvent.click(screen.getByTestId('navbar-trigger-file'))
      fireEvent.click(screen.getByTestId('navbar-item-open-folder'))
      expect(onFileAction).toHaveBeenCalledWith('open')
    })

    it('should call onFileAction("save") when Save is clicked', () => {
      const { onFileAction } = renderNavBar()
      fireEvent.click(screen.getByTestId('navbar-trigger-file'))
      fireEvent.click(screen.getByTestId('navbar-item-save'))
      expect(onFileAction).toHaveBeenCalledWith('save')
    })

    it('should call window.electronAPI.newWindow() when New Window is clicked', () => {
      renderNavBar()
      fireEvent.click(screen.getByTestId('navbar-trigger-file'))
      fireEvent.click(screen.getByTestId('navbar-item-new-window'))
      expect(mockNewWindow).toHaveBeenCalled()
    })

    it('should close dropdown after clicking an item', () => {
      renderNavBar()
      fireEvent.click(screen.getByTestId('navbar-trigger-file'))
      expect(screen.getByTestId('navbar-dropdown-file')).toBeInTheDocument()
      fireEvent.click(screen.getByTestId('navbar-item-new'))
      expect(screen.queryByTestId('navbar-dropdown-file')).not.toBeInTheDocument()
    })
  })

  describe('View Menu', () => {
    it('should open View dropdown on click', () => {
      renderNavBar()
      fireEvent.click(screen.getByTestId('navbar-trigger-view'))
      expect(screen.getByTestId('navbar-dropdown-view')).toBeInTheDocument()
    })

    it('should call onViewAction("toggleSidebar") when Toggle Sidebar is clicked', () => {
      const { onViewAction } = renderNavBar()
      fireEvent.click(screen.getByTestId('navbar-trigger-view'))
      fireEvent.click(screen.getByTestId('navbar-item-toggle-sidebar'))
      expect(onViewAction).toHaveBeenCalledWith('toggleSidebar')
    })

    it('should render Toggle AI Panel item', () => {
      renderNavBar()
      fireEvent.click(screen.getByTestId('navbar-trigger-view'))
      expect(screen.getByTestId('navbar-item-toggle-ai-panel')).toHaveTextContent(
        'Toggle AI Panel'
      )
    })
  })

  describe('Settings Menu', () => {
    it('should open Settings dropdown on click', () => {
      renderNavBar()
      fireEvent.click(screen.getByTestId('navbar-trigger-settings'))
      expect(screen.getByTestId('navbar-dropdown-settings')).toBeInTheDocument()
    })

    it('should show Preferences item', () => {
      renderNavBar()
      fireEvent.click(screen.getByTestId('navbar-trigger-settings'))
      expect(screen.getByTestId('navbar-item-preferences')).toHaveTextContent('Preferences')
    })
  })

  describe('Menu Toggle Behavior', () => {
    it('should close an open menu when clicking its trigger again', () => {
      renderNavBar()
      fireEvent.click(screen.getByTestId('navbar-trigger-file'))
      expect(screen.getByTestId('navbar-dropdown-file')).toBeInTheDocument()
      fireEvent.click(screen.getByTestId('navbar-trigger-file'))
      expect(screen.queryByTestId('navbar-dropdown-file')).not.toBeInTheDocument()
    })

    it('should switch to another menu when clicking a different trigger', () => {
      renderNavBar()
      fireEvent.click(screen.getByTestId('navbar-trigger-file'))
      expect(screen.getByTestId('navbar-dropdown-file')).toBeInTheDocument()
      fireEvent.click(screen.getByTestId('navbar-trigger-view'))
      expect(screen.queryByTestId('navbar-dropdown-file')).not.toBeInTheDocument()
      expect(screen.getByTestId('navbar-dropdown-view')).toBeInTheDocument()
    })
  })
})
