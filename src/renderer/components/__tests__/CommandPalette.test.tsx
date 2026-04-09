import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { CommandPalette } from '../CommandPalette'
import type { Command } from '../CommandPalette'

const mockCommands: Command[] = [
  { id: 'toggleSidebar', label: 'Toggle Sidebar', shortcut: 'Ctrl+B', action: jest.fn() },
  { id: 'toggleTerminal', label: 'Toggle Terminal', shortcut: 'Ctrl+`', action: jest.fn() },
  { id: 'openFile', label: 'Open File', shortcut: 'Ctrl+P', action: jest.fn() },
  { id: 'saveFile', label: 'Save File', shortcut: 'Ctrl+S', action: jest.fn() },
  { id: 'preferences', label: 'Preferences', action: jest.fn() }
]

function resetMocks(): void {
  mockCommands.forEach((cmd) => (cmd.action as jest.Mock).mockClear())
}

describe('CommandPalette', () => {
  beforeEach(resetMocks)

  it('renders nothing when not visible', () => {
    const { container } = render(
      <CommandPalette visible={false} onClose={jest.fn()} commands={mockCommands} />
    )
    expect(container.innerHTML).toBe('')
  })

  it('renders all commands when visible with empty query', () => {
    render(<CommandPalette visible={true} onClose={jest.fn()} commands={mockCommands} />)
    expect(screen.getByTestId('command-palette')).toBeInTheDocument()
    expect(screen.getByText('Toggle Sidebar')).toBeInTheDocument()
    expect(screen.getByText('Toggle Terminal')).toBeInTheDocument()
    expect(screen.getByText('Open File')).toBeInTheDocument()
    expect(screen.getByText('Save File')).toBeInTheDocument()
    expect(screen.getByText('Preferences')).toBeInTheDocument()
  })

  it('displays keyboard shortcuts', () => {
    render(<CommandPalette visible={true} onClose={jest.fn()} commands={mockCommands} />)
    expect(screen.getByText('Ctrl+B')).toBeInTheDocument()
    expect(screen.getByText('Ctrl+S')).toBeInTheDocument()
  })

  it('filters commands by fuzzy match', () => {
    render(<CommandPalette visible={true} onClose={jest.fn()} commands={mockCommands} />)
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'toggle' } })
    expect(screen.getByText('Toggle Sidebar')).toBeInTheDocument()
    expect(screen.getByText('Toggle Terminal')).toBeInTheDocument()
    expect(screen.queryByText('Save File')).not.toBeInTheDocument()
    expect(screen.queryByText('Preferences')).not.toBeInTheDocument()
  })

  it('shows no match message when no commands match', () => {
    render(<CommandPalette visible={true} onClose={jest.fn()} commands={mockCommands} />)
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'zzzzz' } })
    expect(screen.getByText('No matching commands')).toBeInTheDocument()
  })

  it('calls onClose when Escape is pressed', () => {
    const onClose = jest.fn()
    render(<CommandPalette visible={true} onClose={onClose} commands={mockCommands} />)
    const input = screen.getByRole('textbox')
    fireEvent.keyDown(input, { key: 'Escape' })
    expect(onClose).toHaveBeenCalled()
  })

  it('calls onClose when overlay is clicked', () => {
    const onClose = jest.fn()
    const { container } = render(
      <CommandPalette visible={true} onClose={onClose} commands={mockCommands} />
    )
    const overlay = container.querySelector('.command-palette-overlay')!
    fireEvent.click(overlay)
    expect(onClose).toHaveBeenCalled()
  })

  it('executes command on Enter and calls onClose', () => {
    const onClose = jest.fn()
    render(<CommandPalette visible={true} onClose={onClose} commands={mockCommands} />)
    const input = screen.getByRole('textbox')
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(mockCommands[0].action).toHaveBeenCalled()
    expect(onClose).toHaveBeenCalled()
  })

  it('navigates with arrow keys', () => {
    render(<CommandPalette visible={true} onClose={jest.fn()} commands={mockCommands} />)
    const input = screen.getByRole('textbox')
    // First item is selected by default
    const items = screen.getAllByText(/Toggle Sidebar|Toggle Terminal|Open File|Save File|Preferences/)
    expect(items[0].closest('.command-palette-item')).toHaveClass('selected')

    // Arrow down
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    const updatedItems = screen.getByTestId('command-palette').querySelectorAll('.command-palette-item')
    expect(updatedItems[1]).toHaveClass('selected')
  })

  it('executes command on click', () => {
    const onClose = jest.fn()
    render(<CommandPalette visible={true} onClose={onClose} commands={mockCommands} />)
    fireEvent.click(screen.getByText('Preferences'))
    expect(mockCommands[4].action).toHaveBeenCalled()
    expect(onClose).toHaveBeenCalled()
  })

  it('supports Chinese locale', () => {
    render(<CommandPalette visible={true} onClose={jest.fn()} commands={mockCommands} lang="zh" />)
    const input = screen.getByRole('textbox')
    expect(input).toHaveAttribute('placeholder', '输入命令...')
  })
})
