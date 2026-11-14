const Therapist = require("../models/Therapist");

function slugify(name) {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "therapist"
  );
}

async function generateUniqueSlug(name, excludeTherapistId = null) {
  const baseSlug = slugify(name);
  let slug = baseSlug;
  let counter = 2;

  while (
    await Therapist.exists({
      slug,
      ...(excludeTherapistId && {
        _id: { $ne: excludeTherapistId },
      }),
    })
  ) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  return slug;
}

module.exports = generateUniqueSlug;