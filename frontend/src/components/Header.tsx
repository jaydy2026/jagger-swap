import React from 'react';
import { Camera, Github } from 'lucide-react';

interface HeaderProps {
  onStart?: () => void;
}

export function Header({ onStart }: HeaderProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b bg-background/80 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center space-x-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
            <Camera className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">JAGGER SWAP</h1>
            <p className="text-xs text-muted-foreground">
              Real-time Portrait Animation
            </p>
          </div>
        </div>

        <nav className="hidden items-center space-x-6 md:flex">
          <a
            href="#features"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Features
          </a>
          <a
            href="#how-it-works"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            How It Works
          </a>
          <a
            href="#docs"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Documentation
          </a>
        </nav>

        <div className="flex items-center space-x-4">
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden text-muted-foreground transition-colors hover:text-foreground md:block"
          >
            <Github className="h-5 w-5" />
          </a>
          {onStart && (
            <button
              onClick={onStart}
              className="rounded-full bg-primary px-6 py-2 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/25"
            >
              Get Started
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
