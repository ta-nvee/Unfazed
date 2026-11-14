
import { useNavigate } from "react-router-dom";

function Welcome() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#f7f8f2] flex items-center justify-center px-5 py-12">
      <div className="w-full max-w-5xl">

        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-[#315b49]">
            unfazed<span className="text-[#d39b78]">.</span>
          </h1>

          <p className="mt-5 text-sm tracking-[0.2em] text-[#8b9a8d] uppercase">
            Your space to feel better
          </p>

          <h2 className="mt-4 text-3xl md:text-4xl font-semibold text-[#263b30]">
            How would you like to begin?
          </h2>

          <p className="mt-3 text-[#78847a]">
            A little support can make a big difference.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-7">

          {/* Therapist */}
          <div className="bg-white rounded-3xl p-8 border border-[#e6e9df] shadow-sm">
            <div className="text-4xl mb-6">🌿</div>

            <h3 className="text-2xl font-semibold text-[#315b49]">
              I'm a Therapist
            </h3>

            <p className="text-[#78847a] mt-3 leading-7">
              Manage clients, schedule sessions and grow your therapy practice.
            </p>

            <div className="mt-8 space-y-3">
              <button
                type="button"
                onClick={() => navigate("/login")}
                className="w-full cursor-pointer bg-[#315b49] text-white py-3 rounded-xl font-semibold hover:bg-[#264737]"
              >
                Login as Therapist
              </button>

              <button
                type="button"
                onClick={() => navigate("/register")}
                className="w-full cursor-pointer border border-[#dce3d9] text-[#315b49] py-3 rounded-xl font-semibold hover:bg-[#f5f8f3]"
              >
                Register as Therapist
              </button>
            </div>
          </div>

          {/* Client */}
          <div className="bg-white rounded-3xl p-8 border border-[#e6e9df] shadow-sm">
            <div className="text-4xl mb-6">♡</div>

            <h3 className="text-2xl font-semibold text-[#315b49]">
              I'm a Client
            </h3>

            <p className="text-[#78847a] mt-3 leading-7">
              Discover therapists, explore services and book sessions.
            </p>

            <div className="mt-8 space-y-3">
              <button
                type="button"
                onClick={() => navigate("/client/login")}
                className="w-full cursor-pointer bg-[#c28e70] text-white py-3 rounded-xl font-semibold hover:bg-[#ae795c]"
              >
                Login as Client
              </button>

              <button
                type="button"
                onClick={() => navigate("/client/register")}
                className="w-full cursor-pointer border border-[#eadbd0] text-[#a9785e] py-3 rounded-xl font-semibold hover:bg-[#fcf7f3]"
              >
                Register as Client
              </button>
            </div>
          </div>

        </div>

        <p className="text-center text-sm text-[#9aa399] mt-10">
          Made with care by unfazed. ♡
        </p>

      </div>
    </div>
  );
}

export default Welcome;
