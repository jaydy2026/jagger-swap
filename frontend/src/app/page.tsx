'use client';

import { useState } from 'react';
import { Header, Hero, SessionView } from '@/components';

export default function Home() {
  const [isSessionStarted, setIsSessionStarted] = useState(false);

  const handleStart = () => {
    setIsSessionStarted(true);
  };

  const handleExit = () => {
    setIsSessionStarted(false);
  };

  if (isSessionStarted) {
    return <SessionView onExit={handleExit} />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header onStart={handleStart} />
      <main>
        <Hero onStart={handleStart} />
        
        {/* Features Section */}
        <section id="features" className="py-24">
          <div className="container mx-auto px-4">
            <h2 className="mb-12 text-center text-3xl font-bold tracking-tight md:text-4xl">
              Powerful Features
            </h2>
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
              <FeatureCard
                icon="🎯"
                title="Precise Tracking"
                description="Advanced body and facial landmark detection for accurate movement capture"
              />
              <FeatureCard
                icon="🖼️"
                title="Identity Preservation"
                description="Maintains facial features, hair, clothing, and accessories with minimal artifacts"
              />
              <FeatureCard
                icon="⚡"
                title="Real-Time Performance"
                description="Optimized inference for smooth 30+ FPS animation on modern hardware"
              />
              <FeatureCard
                icon="🔒"
                title="Privacy-First"
                description="All processing can be done locally. Your images stay on your device"
              />
              <FeatureCard
                icon="🎨"
                title="Artistic Control"
                description="Adjust animation style, smoothing, and fidelity to match your creative vision"
              />
              <FeatureCard
                icon="🌐"
                title="Cross-Platform"
                description="Works on desktop and laptop browsers with WebGL acceleration"
              />
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section id="how-it-works" className="bg-muted/50 py-24">
          <div className="container mx-auto px-4">
            <h2 className="mb-12 text-center text-3xl font-bold tracking-tight md:text-4xl">
              How It Works
            </h2>
            <div className="mx-auto max-w-4xl">
              <div className="space-y-12">
                <StepCard
                  number={1}
                  title="Allow Camera Access"
                  description="Enable your webcam so we can capture your movements and expressions in real-time"
                />
                <StepCard
                  number={2}
                  title="Upload a Portrait"
                  description="Choose a clear, front-facing photo of the person you want to animate"
                />
                <StepCard
                  number={3}
                  title="Watch the Magic"
                  description="Our AI analyzes your movements and applies them to the uploaded portrait"
                />
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="mb-6 text-3xl font-bold tracking-tight md:text-4xl">
                Ready to Bring Your Portraits to Life?
              </h2>
              <p className="mb-8 text-lg text-muted-foreground">
                Join us in revolutionizing digital portrait animation. 
                Upload your first image and see the difference.
              </p>
              <button
                onClick={handleStart}
                className="rounded-full bg-primary px-8 py-4 text-lg font-medium text-primary-foreground shadow-lg transition-all hover:bg-primary/90 hover:shadow-xl"
              >
                Get Started Now
              </button>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t py-12">
          <div className="container mx-auto px-4">
            <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                  <span className="text-sm font-bold text-primary-foreground">JS</span>
                </div>
                <span className="font-semibold">JAGGER SWAP</span>
              </div>
              <p className="text-sm text-muted-foreground">
                © 2024 JAGGER SWAP. Built for the future of portrait animation.
              </p>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm transition-shadow hover:shadow-md">
      <div className="mb-4 text-4xl">{icon}</div>
      <h3 className="mb-2 text-xl font-semibold">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  );
}

function StepCard({
  number,
  title,
  description,
}: {
  number: number;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-6">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
        {number}
      </div>
      <div>
        <h3 className="mb-2 text-xl font-semibold">{title}</h3>
        <p className="text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
