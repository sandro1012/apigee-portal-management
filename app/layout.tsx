import React from "react";

export const metadata = {
  title: "Apigee KVM Portal",
  description: "Starter portal for Apigee KVM management"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body style={{fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans"}}>
        <div style={{maxWidth: 960, margin: "32px auto", padding: "0 16px"}}>
          {children}
        </div>
      </body>
    </html>
  );
}