import type { Metadata } from "next";
export const metadata: Metadata = {title:"Material Collector",description:"Telegram bot backend"};
export default function RootLayout({children}:{children:React.ReactNode}) { return <html lang="ru"><body style={{fontFamily:"Arial,sans-serif",margin:0,padding:32}}>{children}</body></html>; }
