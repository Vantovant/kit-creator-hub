import Image from "next/image";
import Link from "next/link";
import { Star } from "lucide-react";

const avatars = [
  "https://ext.same-assets.com/6076700/1309194076.avif",
  "https://ext.same-assets.com/6076700/879460062.avif",
  "https://ext.same-assets.com/6076700/1959138877.avif",
  "https://ext.same-assets.com/6076700/646852755.avif",
  "https://ext.same-assets.com/6076700/1529637643.avif",
  "https://ext.same-assets.com/6076700/1815330676.avif",
];

export function FinalCTA() {
  return (
    <section className="py-20 bg-[#1a1a1a] text-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Star rating */}
        <div className="flex justify-center gap-1 mb-4">
          {[...Array(5)].map((_, i) => (
            <Star key={`star-${i + 1}`} className="w-5 h-5 fill-[#E8B86D] text-[#E8B86D]" />
          ))}
        </div>

        {/* Avatars */}
        <div className="flex justify-center -space-x-2 mb-4">
          {avatars.map((avatar, index) => (
            <div
              key={`avatar-${index + 1}`}
              className="w-10 h-10 rounded-full border-2 border-[#1a1a1a] overflow-hidden"
            >
              <Image
                src={avatar}
                alt={`Creator ${index + 1}`}
                width={40}
                height={40}
                className="w-full h-full object-cover"
              />
            </div>
          ))}
        </div>

        {/* Quote */}
        <p className="text-gray-400 mb-2">"Kit has creators in mind."</p>
        <p className="font-medium mb-8">Lawrence Yeo</p>

        {/* Heading */}
        <h2 className="text-4xl md:text-5xl lg:text-6xl font-serif mb-6">
          Ready to be more time-rich?
        </h2>
        <p className="text-gray-400 mb-8 max-w-xl mx-auto">
          We'll grow your business in the background so you can focus on what matters most.
        </p>

        {/* CTA */}
        <Link
          href="#"
          className="inline-flex items-center justify-center px-8 py-4 text-lg font-medium text-black bg-[#5CC5DE] hover:bg-[#4AB5CE] rounded-full transition-colors"
        >
          Start free trial
        </Link>
        <p className="mt-4 text-sm text-gray-500">No credit card required</p>

        {/* Product preview */}
        <div className="mt-16 relative">
          <div className="rounded-2xl overflow-hidden shadow-2xl">
            <Image
              src="https://media.kit.com/images/pages/home/product/send-1-desktop.jpg?q=75&fm=webp&auto=format"
              alt="Kit email designer preview"
              width={1200}
              height={700}
              className="w-full h-auto"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
