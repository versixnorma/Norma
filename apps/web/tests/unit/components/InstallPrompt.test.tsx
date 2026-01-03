import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { InstallPrompt } from '../../../src/components/pwa/InstallPrompt';

// Mock do hook useInstallPrompt
const mockPromptInstall = vi.fn();
const mockUseInstallPrompt = vi.fn();

vi.mock('../../../src/lib/pwa', () => ({
  useInstallPrompt: () => mockUseInstallPrompt(),
}));

describe('InstallPrompt', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('should not render if canInstall is false', () => {
    mockUseInstallPrompt.mockReturnValue({
      canInstall: false,
      isInstalled: false,
      isIOS: false,
      promptInstall: mockPromptInstall,
    });

    render(<InstallPrompt />);
    expect(screen.queryByText('Instale o Versix Norma')).toBeNull();
  });

  it('should render if canInstall is true', () => {
    mockUseInstallPrompt.mockReturnValue({
      canInstall: true,
      isInstalled: false,
      isIOS: false,
      promptInstall: mockPromptInstall,
    });

    render(<InstallPrompt />);
    expect(screen.getByText('Instale o Versix Norma')).toBeDefined();
  });

  it('should not render if already installed', () => {
    mockUseInstallPrompt.mockReturnValue({
      canInstall: true,
      isInstalled: true, // Já instalado
      isIOS: false,
      promptInstall: mockPromptInstall,
    });

    render(<InstallPrompt />);
    expect(screen.queryByText('Instale o Versix Norma')).toBeNull();
  });

  it('should call promptInstall when install button is clicked', () => {
    mockUseInstallPrompt.mockReturnValue({
      canInstall: true,
      isInstalled: false,
      isIOS: false,
      promptInstall: mockPromptInstall,
    });

    render(<InstallPrompt />);

    const installButton = screen.getByText('Instalar');
    fireEvent.click(installButton);

    expect(mockPromptInstall).toHaveBeenCalledTimes(1);
  });

  it('should dismiss when "Agora não" is clicked', () => {
    mockUseInstallPrompt.mockReturnValue({
      canInstall: true,
      isInstalled: false,
      isIOS: false,
      promptInstall: mockPromptInstall,
    });

    render(<InstallPrompt />);

    const dismissButton = screen.getByText('Agora não');
    fireEvent.click(dismissButton);

    // Componente deve desaparecer (rerender ou check state)
    // Como o state é interno, verificamos se ele foi removido do documento
    expect(screen.queryByText('Instale o Versix Norma')).toBeNull();
  });
});
