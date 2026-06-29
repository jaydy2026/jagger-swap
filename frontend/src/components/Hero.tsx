import React from 'react';
import { ArrowRight, Play, Sparkles } from 'lucide-react';
import { Button } from './ui/Button';

interface HeroProps {
  onStart: () => void;
}

export function Hero({ onStart }: HeroProps) {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/10" />
      
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/5 blur-3xl" />
      </div>

      <div className="container relative z-10 mx-auto px-4 py-32">
        <div className="mx-auto max-w-4xl text-center">
          {/* Badge */}
          <div className="mb-8 inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-sm text-primary">
            <Sparkles className="mr-2 h-4 w-4" />
            <span>Powered by Advanced AI</span>
          </div>

          {/* Main heading */}
          <h1 className="mb-6 text-5xl font-bold tracking-tight sm:text-6xl md:text-7xl">
            <span className="block">Animate Your</span>
            <span className="bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
              Portrait in Real-Time
            </span>
          </h1>

          {/* Description */}
          <p className="mb-10 text-lg text-muted-foreground sm:text-xl">
            Upload a portrait and watch it come alive. Our AI-powered system
            tracks your movements and expressions to animate any image with
            stunning realism.
          </p>

          {/* CTA buttons */}
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button
              size="lg"
              onClick={onStart}
              className="group btn-glow"
            >
              <Play className="mr-2 h-5 w-5" />
              Start Now
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
            >
              Learn More
            </Button>
          </div>

          {/* Feature highlights */}
          <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-3">
            <div className="glass rounded-xl p-6">
              <div className="mb-4 text-3xl">🎭</div>
              <h3 className="mb-2 text-lg font-semibold">Face Preservation</h3>
              <p className="text-sm text-muted-foreground">
                Maintains original identity, hair, and accessories with minimal flicker
              </p>
            </div>
            <div className="glass rounded-xl p-6">
              <div className="mb-4 text-3xl">⚡</div>
              <h3 className="mb-2 text-lg font-semibold">Real-Time Animation</h3>
              <p className="text-sm text-muted-foreground">
                Smooth 30+ FPS animation driven by your webcam movements
              </p>
            </div>
            <div className="glass rounded-xl p-6">
              <div className="mb-4 text-3xl">🔒</div>
              <h3 className="mb-2 text-lg font-semibold">Privacy First</h3>
              <p className="text-sm text-muted-foreground">
                All processing happens locally. Your images never leave your device
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <div className="h-8 w-5 rounded-full border-2 border-muted-foreground/30 p-1">
          <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50" />
        </div>
      </div>
    </section>
  );
}
