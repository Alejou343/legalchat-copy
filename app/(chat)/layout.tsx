import "./globals.css";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { Topbar } from "@/components/topbar";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <div className="flex flex-col h-[calc(100dvh-2rem)] m-4">
            <Toaster position="top-center" richColors />
            <Topbar />
            {children}
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
