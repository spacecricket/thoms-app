import { Alex_Brush } from "next/font/google";
import Link from "next/link";

const alexBrush = Alex_Brush({ weight: "400", subsets: ["latin"] });

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white">
      <p className={`${alexBrush.className} text-[12rem] leading-none text-gray-900`}>
        tjs
      </p>
      <div className="mt-6 flex items-center gap-3 text-sm text-gray-400">
        <Link href="/leagues" className="transition-colors hover:text-gray-900">
          leagues →
        </Link>
        {/* Local-only tool: hidden from production builds. */}
        {process.env.NODE_ENV !== "production" && (
          <>
            <span aria-hidden>·</span>
            <Link
              href="/tournament-rating-predictor"
              className="transition-colors hover:text-gray-900"
            >
              ratings →
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
