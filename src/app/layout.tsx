import type { Metadata } from 'next';
import { Inter, JetBrains_Mono, Fira_Code } from 'next/font/google';
import './globals.css';
// Toaster is now part of Providers
// ThemeProvider is now part of Providers
import { Providers } from './providers'; // Import the new Providers component

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  weight: ['400', '700'], 
});

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-jetbrains-mono',
  subsets: ['latin'],
  weight: ['400', '500', '700'],
});

const firaCode = Fira_Code({
  subsets: ['latin'],
  variable: '--font-fira-code',
  weight: ['400', '500', '700'],
});

export const metadata: Metadata = {
  title: 'PromptVerse - Your AI Prompts, Perfectly Organized',
  description: 'Organize, version, and efficiently access your AI prompts.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${jetbrainsMono.variable} ${firaCode.variable} antialiased`}>
        <Providers>
          {children}
          {/* Toaster is now rendered within Providers to ensure it has access to ThemeContext if needed */}
        </Providers>
      </body>
    </html>
  );
}
