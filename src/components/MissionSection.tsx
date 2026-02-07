import Image from "next/image";
import Link from "next/link";

const stats = [
  {
    value: "587M+",
    label: "subscribers served",
    description: "More than a decade supporting creators who put their subscribers first.",
  },
  {
    value: "13+",
    label: "years of expertise",
    description: "We know a thing or two about leveraging email to grow creator businesses.",
  },
];

export function MissionSection() {
  return (
    <section className="py-20 bg-[#1a1a1a] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-start mb-16">
          <div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-serif mb-6">
              Kit serves creators, not investors
            </h2>
            <Link
              href="#"
              className="inline-flex items-center justify-center px-6 py-3 text-base font-medium text-black bg-[#5CC5DE] hover:bg-[#4AB5CE] rounded-full transition-colors"
            >
              Start free trial
            </Link>
            <p className="mt-3 text-sm text-gray-400">No credit card required</p>
          </div>
          <div>
            <p className="text-gray-300 mb-4">
              When Kit founder Nathan Barry published his first book in 2013, he discovered what every creator learns:{" "}
              <strong className="text-white">email marketing works.</strong>
            </p>
            <p className="text-gray-300 mb-4">
              The problem? It was impossibly complicated. He wanted to create a platform that was accessible for creators running solo businesses, with tools they could easily use to share their expertise and serve people well.
            </p>
            <p className="text-gray-300">
              Today Kit is still bootstrapped, mission-driven, and seriously focused on solving the real problems creators face, so you can get back to creating the work that matters.
            </p>
          </div>
        </div>

        {/* Stats and images grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Team image 1 */}
          <div className="aspect-square rounded-2xl overflow-hidden">
            <Image
              src="https://ext.same-assets.com/6076700/2094314899.avif"
              alt="Kit team members"
              width={400}
              height={400}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Stat 1 */}
          <div className="bg-[#2a2a2a] rounded-2xl p-8 flex flex-col justify-center">
            <span className="text-4xl md:text-5xl font-serif text-[#5CC5DE] mb-2">
              {stats[0].value}
            </span>
            <span className="font-medium mb-2">{stats[0].label}</span>
            <p className="text-sm text-gray-400">{stats[0].description}</p>
          </div>

          {/* Team image 2 */}
          <div className="aspect-square rounded-2xl overflow-hidden">
            <Image
              src="https://ext.same-assets.com/6076700/4168965185.avif"
              alt="Kit team member"
              width={400}
              height={400}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Team image 3 */}
          <div className="aspect-square rounded-2xl overflow-hidden">
            <Image
              src="https://ext.same-assets.com/6076700/562821212.avif"
              alt="Kit team members"
              width={400}
              height={400}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Stat 2 */}
          <div className="bg-[#2a2a2a] rounded-2xl p-8 flex flex-col justify-center">
            <span className="text-4xl md:text-5xl font-serif text-[#5CC5DE] mb-2">
              {stats[1].value}
            </span>
            <span className="font-medium mb-2">{stats[1].label}</span>
            <p className="text-sm text-gray-400">{stats[1].description}</p>
          </div>

          {/* Team image 4 */}
          <div className="aspect-square rounded-2xl overflow-hidden">
            <Image
              src="https://ext.same-assets.com/6076700/3383330186.avif"
              alt="Kit team member"
              width={400}
              height={400}
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
