import { Alex_Brush } from "next/font/google";
import Link from "next/link";

const alexBrush = Alex_Brush({ weight: "400", subsets: ["latin"] });

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white">
      <p className={`${alexBrush.className} text-[12rem] leading-none text-gray-900`}>
        tjs
      </p>
      <Link
        href="/league"
        className="mt-6 text-sm text-gray-400 transition-colors hover:text-gray-900"
      >
        league →
      </Link>
    </div>
  );
}
