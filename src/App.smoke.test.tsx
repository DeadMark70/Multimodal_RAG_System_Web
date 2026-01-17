import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import App from './App';
import React from 'react';

// Mock components to isolate routing
vi.mock('./pages/Dashboard', () => ({ default: () => <div>Dashboard Page</div> }));
vi.mock('./pages/Login', () => ({ default: () => <div>Login Page</div> }));

describe('App Smoke Test', () => {
  it('renders without crashing', () => {
    render(<App />);
    // Should redirect to Dashboard or Login (depending on Auth)
    // AuthProvider logic might be tricky.
    // If loading, it might show nothing.
  });
});
