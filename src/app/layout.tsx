import type { Metadata } from 'next';
// Removed Geist_Sans and Geist_Mono as they are not standard Google Fonts and caused errors.
// Added Inter and Fira_Code to align with style guidelines (Inter for headers, Fira_Code for code).
import { Inter, JetBrains_Mono, Fira_Code } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { ThemeProvider } from '@/components/theme-provider';

// Instantiate Inter for headers
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  weight: ['400', '700'], // Regular and Bold weights
});

// JetBrains_Mono for code (already configured)
const jetbrainsMono = JetBrains_Mono({
  variable: '--font-jetbrains-mono',
  subsets: ['latin'],
  weight: ['400', '500', '700'],
});

// Instantiate Fira_Code for code (alternative/fallback)
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
      {/* Updated body className to include new font variables and remove old ones */}
      <body className={`${inter.variable} ${jetbrainsMono.variable} ${firaCode.variable} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
