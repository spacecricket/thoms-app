import { Alex_Brush } from "next/font/google";
import Link from "next/link";

const alexBrush = Alex_Brush({ weight: "400", subsets: ["latin"] });

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-900">
      <p className={`${alexBrush.className} text-[12rem] leading-none text-slate-100`}>
        tjs
      </p>
      <Link
        href="/league"
        className="mt-6 text-sm text-slate-400 transition-colors hover:text-slate-100"
      >
        league →
      </Link>
    </div>
  );
}
