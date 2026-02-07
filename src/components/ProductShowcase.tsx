import Image from "next/image";

export function ProductShowcase() {
  return (
    <section className="py-16 bg-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-2xl overflow-hidden shadow-2xl bg-white border border-gray-200">
          {/* Email editor mockup */}
          <div className="bg-[#F8F7F4] p-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-500">Subject Line</span>
              <div className="flex-1 bg-white rounded-lg border border-gray-200 px-3 py-2">
                <span className="text-sm text-gray-400">New subject</span>
              </div>
            </div>
          </div>
          <div className="grid lg:grid-cols-3">
            {/* Email content area */}
            <div className="lg:col-span-2 p-6 bg-[#F8F7F4]">
              {/* Toolbar */}
              <div className="flex items-center gap-2 mb-4 flex-wrap">
                <button type="button" className="p-2 hover:bg-gray-200 rounded">
                  <span className="text-sm font-bold">B</span>
                </button>
                <button type="button" className="p-2 hover:bg-gray-200 rounded">
                  <span className="text-sm italic">I</span>
                </button>
                <button type="button" className="p-2 hover:bg-gray-200 rounded">
                  <span className="text-sm underline">U</span>
                </button>
                <span className="w-px h-4 bg-gray-300" />
                <button type="button" className="p-2 hover:bg-gray-200 rounded text-sm">
                  H1
                </button>
                <button type="button" className="p-2 hover:bg-gray-200 rounded text-sm">
                  H2
                </button>
                <span className="w-px h-4 bg-gray-300" />
                <button type="button" className="px-3 py-1 text-sm bg-gray-100 rounded hover:bg-gray-200">
                  Preview
                </button>
              </div>

              {/* Email preview */}
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <div className="w-full h-8 bg-[#E8B86D] rounded-full flex items-center justify-center mb-6">
                  <span className="text-sm font-medium text-black">Summer Book Selection drop #2</span>
                </div>
                <div className="flex items-center gap-4 mb-6">
                  <div className="bg-gray-100 rounded-lg px-4 py-2">
                    <span className="text-xs text-gray-500">Layout</span>
                    <br />
                    <span className="text-sm">Structure for your content</span>
                  </div>
                  <div className="bg-black text-white rounded-lg px-4 py-2">
                    <span className="text-sm font-medium">boox.</span>
                  </div>
                </div>
                <h2 className="text-2xl font-serif text-center mb-4">
                  Boox Club Kicks Off Next Month!
                </h2>
                <div className="h-32 bg-gradient-to-r from-amber-100 to-amber-200 rounded-lg flex items-end justify-center pb-4">
                  <div className="flex gap-2">
                    <div className="w-8 h-12 bg-gray-800 rounded-sm" />
                    <div className="w-8 h-14 bg-amber-700 rounded-sm" />
                    <div className="w-8 h-12 bg-teal-700 rounded-sm" />
                  </div>
                </div>
              </div>
            </div>

            {/* Settings panel */}
            <div className="p-6 bg-white border-l border-gray-200">
              <h3 className="text-sm font-medium mb-4">Email Settings</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-gray-500 block mb-2">Template</label>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-16 bg-gray-100 rounded border border-gray-200" />
                    <div>
                      <p className="text-sm font-medium">Creator Newsletter</p>
                      <button type="button" className="text-xs text-gray-500 hover:text-black">
                        Browse templates
                      </button>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-2">Background</label>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-black border-2 border-gray-300" />
                    <span className="text-sm">#000000</span>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-2">Padding</label>
                  <div className="flex gap-2">
                    {["Small", "Medium", "Large", "Custom"].map((size) => (
                      <button
                        key={size}
                        type="button"
                        className={`text-xs px-2 py-1 rounded ${
                          size === "Medium" ? "bg-gray-200" : "hover:bg-gray-100"
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
