
function Hero({ therapist }) {
  if (!therapist) return null;

  return (
    <section className="profile-hero">
      <h1>{therapist.name}</h1>

      {therapist.specializations?.length > 0 && (
        <p>{therapist.specializations.join(" • ")}</p>
      )}

      {therapist.bio && <p>{therapist.bio}</p>}

      {therapist.languages?.length > 0 && (
        <p>Languages: {therapist.languages.join(", ")}</p>
      )}
    </section>
  );
}

export default Hero;
