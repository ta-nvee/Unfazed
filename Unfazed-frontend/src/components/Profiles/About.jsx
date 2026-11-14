
const About = ({ therapist }) => {
  if (!therapist) return null;

  return (
    <section className="bg-white py-16 px-6 md:px-16">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold text-purple-800 mb-6">
          About Me
        </h2>

        <p className="text-gray-600 leading-relaxed mb-8">
          {therapist.bio || "No biography added yet."}
        </p>

        {therapist.specializations?.length > 0 && (
          <div className="bg-purple-50 p-6 rounded-xl">
            <h3 className="font-semibold text-purple-800 mb-2">
              Specializations
            </h3>
            <p className="text-gray-600">
              {therapist.specializations.join(", ")}
            </p>
          </div>
        )}
      </div>
    </section>
  );
};

export default About;
