import Link from "next/link";

interface FooterLink {
  label: string;
  href: string;
  badge?: string;
}

interface FooterSection {
  title: string;
  links: FooterLink[];
}

const footerLinks: Record<string, FooterSection> = {
  getStarted: {
    title: "GET STARTED",
    links: [
      { label: "Free migrations", href: "#" },
      { label: "Watch demo", href: "#" },
      { label: "Request a demo", href: "#" },
    ],
  },
  useCases: {
    title: "USE CASES",
    links: [
      { label: "Artists", href: "#" },
      { label: "Authors", href: "#" },
      { label: "Bloggers", href: "#" },
      { label: "Coaches", href: "#" },
      { label: "Course creators", href: "#" },
      { label: "Marketers", href: "#" },
      { label: "Musicians", href: "#" },
      { label: "Newsletter creators", href: "#" },
      { label: "Podcasters", href: "#" },
      { label: "YouTubers", href: "#" },
    ],
  },
  features: {
    title: "FEATURES",
    links: [
      { label: "Landing pages", href: "#" },
      { label: "Forms", href: "#" },
      { label: "Recommendations", href: "#" },
      { label: "Creator Network", href: "#" },
      { label: "Email designer", href: "#" },
      { label: "Email marketing", href: "#" },
      { label: "Deliverability", href: "#" },
      { label: "Visual automations", href: "#" },
      { label: "Kit App Store", href: "#", badge: "NEW" },
      { label: "Commerce", href: "#" },
      { label: "Paid recommendations", href: "#" },
    ],
  },
  resources: {
    title: "RESOURCES",
    links: [
      { label: "Blog", href: "#" },
      { label: "Rebranding in Public", href: "#" },
      { label: "Email template marketplace", href: "#" },
      { label: "Podcasts", href: "#" },
      { label: "Kit University", href: "#" },
      { label: "Experts", href: "#" },
      { label: "Get support", href: "#" },
      { label: "Report spam", href: "#" },
      { label: "Knowledge base", href: "#" },
      { label: "Subscribe to our newsletter", href: "#" },
      { label: "Sitemap", href: "#" },
    ],
  },
  product: {
    title: "PRODUCT",
    links: [
      { label: "Product overview", href: "#" },
      { label: "What's new", href: "#" },
      { label: "Mailchimp vs Kit", href: "#" },
      { label: "ActiveCampaign vs Kit", href: "#" },
      { label: "Mailerlite vs Kit", href: "#" },
      { label: "Beehiiv vs Kit", href: "#" },
      { label: "Substack vs Kit", href: "#" },
      { label: "Aweber vs Kit", href: "#" },
      { label: "Flodesk vs Kit", href: "#" },
      { label: "Compare platforms", href: "#" },
    ],
  },
  company: {
    title: "COMPANY",
    links: [
      { label: "About", href: "#" },
      { label: "Kit Studios", href: "#", badge: "NEW" },
      { label: "Press", href: "#" },
      { label: "Careers", href: "#" },
      { label: "Brand assets", href: "#" },
      { label: "Affiliate program", href: "#" },
      { label: "ConvertKit is now Kit", href: "#" },
      { label: "Contact us", href: "#" },
    ],
  },
};

export function Footer() {
  return (
    <footer className="bg-[#1a1a1a] text-white py-16 border-t border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8 mb-16">
          {/* Logo and CTA */}
          <div className="col-span-2 md:col-span-3 lg:col-span-1">
            <Link href="/" className="inline-block mb-4">
              <svg
                width="50"
                height="24"
                viewBox="0 0 50 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="text-white"
              >
                <path d="M0 0.5H5.5V23.5H0V0.5Z" fill="currentColor" />
                <path
                  d="M8.5 0.5H14V9.5L22 0.5H29L19 11.5L30 23.5H23L14 13.5V23.5H8.5V0.5Z"
                  fill="currentColor"
                />
                <path
                  d="M32 5.5C32 2.74 34.24 0.5 37 0.5C39.76 0.5 42 2.74 42 5.5C42 8.26 39.76 10.5 37 10.5C34.24 10.5 32 8.26 32 5.5Z"
                  fill="currentColor"
                />
                <path d="M34 12.5H40V23.5H34V12.5Z" fill="currentColor" />
                <path d="M44 5.5H50V8.5H44V5.5Z" fill="currentColor" />
                <path d="M44 12.5H50V23.5H44V12.5Z" fill="currentColor" />
              </svg>
            </Link>
            <p className="text-sm text-gray-400 mb-4">Formerly ConvertKit</p>
            <Link
              href="#"
              className="inline-flex items-center justify-center px-5 py-2 text-sm font-medium text-black bg-[#5CC5DE] hover:bg-[#4AB5CE] rounded-full transition-colors"
            >
              Start free trial
            </Link>
            <p className="mt-2 text-xs text-gray-500">No credit card required</p>
          </div>

          {/* Link columns */}
          {Object.entries(footerLinks).map(([key, section]) => (
            <div key={key}>
              <h3 className="text-xs font-semibold text-gray-400 tracking-wider mb-4">
                {section.title}
              </h3>
              <ul className="space-y-2">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-gray-300 hover:text-white transition-colors inline-flex items-center gap-2"
                    >
                      {link.label}
                      {link.badge && (
                        <span className="text-[10px] bg-[#5CC5DE] text-black px-1.5 py-0.5 rounded-full font-medium">
                          {link.badge}
                        </span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Social links */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="#" className="text-gray-400 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
            </svg>
          </Link>
          <Link href="#" className="text-gray-400 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
          </Link>
          <Link href="#" className="text-gray-400 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
          </Link>
          <Link href="#" className="text-gray-400 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.401.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.354-.629-2.758-1.379l-.749 2.848c-.269 1.045-1.004 2.352-1.498 3.146 1.123.345 2.306.535 3.55.535 6.607 0 11.985-5.365 11.985-11.987C23.97 5.39 18.592.026 11.985.026L12.017 0z" />
            </svg>
          </Link>
          <Link href="#" className="text-gray-400 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
            </svg>
          </Link>
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between pt-8 border-t border-gray-800">
          <p className="text-sm text-gray-500">Kit &copy; 2026</p>
          <div className="flex gap-6 mt-4 md:mt-0">
            <Link href="#" className="text-sm text-gray-500 hover:text-white transition-colors">
              Privacy Policy
            </Link>
            <Link href="#" className="text-sm text-gray-500 hover:text-white transition-colors">
              Terms of Service
            </Link>
            <Link href="#" className="text-sm text-gray-500 hover:text-white transition-colors">
              GDPR
            </Link>
            <Link href="#" className="text-sm text-gray-500 hover:text-white transition-colors">
              Imprint
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
