function UpgradePrompt({ message, onClose, onUpgrade }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="upgrade-prompt-title"
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
      >
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#edf2ec] text-2xl text-[#607c68]">
          ✦
        </div>

        <h2
          id="upgrade-prompt-title"
          className="text-xl font-bold text-gray-800"
        >
          Time to upgrade!
        </h2>

        <p className="mt-3 text-sm leading-6 text-gray-600">
          {message ||
            "You have reached the limit available on your current plan. Upgrade your subscription to continue."}
        </p>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-200 px-5 py-3 font-medium text-gray-700 hover:bg-gray-50"
          >
            Maybe later
          </button>

          <button
            type="button"
            onClick={onUpgrade}
            className="rounded-lg bg-[#607c68] px-5 py-3 font-medium text-white hover:bg-[#4d6855]"
          >
            View plans
          </button>
        </div>
      </div>
    </div>
  );
}

export default UpgradePrompt;