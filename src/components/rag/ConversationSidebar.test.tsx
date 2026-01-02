import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import ConversationSidebar from './ConversationSidebar';
import { useConversations } from '../../hooks/useConversations';
import type { Conversation } from '../../types/conversation';
import React from 'react';

// Mock the hooks
vi.mock('../../hooks/useConversations');

// Mock child components or icons if necessary (though react-icons usually work fine)

describe('ConversationSidebar Component', () => {
  const mockConversations: Conversation[] = [
    { id: '1', title: 'Chat 1', type: 'chat', created_at: '2024-01-01T10:00:00Z', updated_at: '2024-01-01T10:00:00Z' },
    { id: '2', title: 'Research 1', type: 'research', created_at: '2024-01-02T10:00:00Z', updated_at: '2024-01-02T10:00:00Z' },
  ];

  const mockRemove = vi.fn();
  const mockOnSelect = vi.fn();
  const mockOnNew = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useConversations as any).mockReturnValue({
      conversations: mockConversations,
      isLoading: false,
      remove: mockRemove,
      isDeleting: false,
    });
  });

  it('renders list of conversations', () => {
    render(
      <ConversationSidebar 
        currentId={null} 
        onSelect={mockOnSelect} 
        onNew={mockOnNew} 
      />
    );

    expect(screen.getByText('Chat 1')).toBeInTheDocument();
    expect(screen.getByText('Research 1')).toBeInTheDocument();
  });

  it('calls onSelect when a conversation is clicked', () => {
    render(
      <ConversationSidebar 
        currentId={null} 
        onSelect={mockOnSelect} 
        onNew={mockOnNew} 
      />
    );

    fireEvent.click(screen.getByText('Chat 1'));
    expect(mockOnSelect).toHaveBeenCalledWith('1');
  });

  it('calls onNew when add button is clicked', () => {
    render(
      <ConversationSidebar 
        currentId={null} 
        onSelect={mockOnSelect} 
        onNew={mockOnNew} 
      />
    );

    const addButton = screen.getByLabelText('新增對話');
    fireEvent.click(addButton);
    expect(mockOnNew).toHaveBeenCalledWith('chat');
  });

  it('filters conversations based on search input', () => {
    render(
      <ConversationSidebar 
        currentId={null} 
        onSelect={mockOnSelect} 
        onNew={mockOnNew} 
      />
    );

    const searchInput = screen.getByPlaceholderText('搜尋對話...');
    fireEvent.change(searchInput, { target: { value: 'Research' } });

    expect(screen.queryByText('Chat 1')).not.toBeInTheDocument();
    expect(screen.getByText('Research 1')).toBeInTheDocument();
  });

  it('calls remove when delete button is clicked', () => {
    render(
      <ConversationSidebar 
        currentId={null} 
        onSelect={mockOnSelect} 
        onNew={mockOnNew} 
      />
    );

    // Delete buttons might be hidden by default (opacity 0), but exist in DOM.
    // We can target them by aria-label.
    const deleteButtons = screen.getAllByLabelText('刪除對話');
    fireEvent.click(deleteButtons[0]); // Delete Chat 1

    expect(mockRemove).toHaveBeenCalledWith('1');
  });
});
