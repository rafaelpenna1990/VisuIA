// English text for lib/landing-data.js's content, keyed the same way
// (by feature id / step number) so components can merge it in when the
// visitor's locale is English — the ids/slugs/icons themselves never
// change, only the copy.

export const FEATURES_EN = {
  image: {
    title: 'Image',
    tagline: 'Create and edit images with AI',
    desc: 'Create images from scratch from a description, or edit photos you already have: change the background, style, outfit, lighting.',
    longDesc: 'Describe what you want in plain text and get an image ready in seconds — or upload a photo of yourself and ask to change anything you want, keeping your face and identity. Great for product photos, portraits, social media art, and more.',
  },
  video: {
    title: 'Video',
    tagline: 'Animate photos and create videos with AI',
    desc: 'Animate a still photo, or describe a scene in text and get a short video ready to post.',
    longDesc: 'Turn a still image into video with realistic motion, or describe an entire scene in text and let the AI create it from scratch — with synced audio, depending on the model you choose. Perfect for social media content, ads, and creative prototyping.',
  },
  lipsync: {
    title: 'Lip Sync',
    tagline: 'Sync audio and video automatically',
    desc: 'Sync an audio track with a portrait or video, and the mouth follows the speech automatically.',
    longDesc: 'Upload any audio (your voice, a narrator, even a dub track) and a face photo or video — the AI syncs the lips to the speech automatically. Widely used for digital avatars, dubbing, and educational content.',
  },
  cinema: {
    title: 'Cinema',
    tagline: 'Professional camera and lens effects',
    desc: 'Apply real cinema lenses and cameras to your scenes, from vintage 16mm to digital 8K.',
    longDesc: 'Choose from real cinema cameras and lenses (from vintage 16mm to digital 8K, anamorphic, macro, classic primes) and control focal length and aperture just like a real cinematographer — all applied automatically when your image is generated.',
  },
};

export const MODEL_HIGHLIGHTS_EN = {
  image: [
    { name: 'Nano Banana', desc: 'Edits existing photos while keeping the person\u2019s face and identity — changes background, outfit, style, without losing likeness.' },
    { name: 'Flux', desc: 'Creates images from scratch with high quality and rich detail, great for realistic photos.' },
    { name: 'Midjourney v7', desc: 'Artistic look and creative compositions, ideal for illustrations and pieces with their own style.' },
  ],
  video: [
    { name: 'Kling', desc: 'Fluid, realistic motion, with good scene consistency from start to finish.' },
    { name: 'Veo 3', desc: 'Generates video with synced audio already included, including speech and sound effects.' },
    { name: 'Sora 2', desc: 'Complex scenes with realistic physics and lighting, great for more elaborate sequences.' },
    { name: 'Seedance', desc: 'Fast generation with great value, good for anyone who needs a high volume of content.' },
  ],
  lipsync: [
    { name: 'Sync', desc: 'Precise lip sync from any audio, works well on both videos and photos.' },
    { name: 'Veed Lipsync', desc: 'Natural results even with varied face angles.' },
    { name: 'Infinite Talk', desc: 'A good choice for longer videos, keeping sync consistent from start to finish.' },
  ],
  cinema: [
    { name: 'Professional cameras', desc: 'From vintage 16mm to digital 8K — pick the camera body that gives your scene the right look.' },
    { name: 'Cinema lenses', desc: 'Anamorphic, macro, classic primes: each lens completely changes the texture of the image.' },
    { name: 'Focal length and aperture', desc: 'Control perspective and depth of field just like a real cinematographer.' },
  ],
};

export const STEPS_EN = {
  '1': {
    title: 'Create your account',
    desc: 'Quick signup, no red tape, and you start with free credits to try it out.',
    longDesc: "It takes less than a minute: just an email and password (or sign in with Google). As soon as your account is created, you can choose to subscribe to a plan with a 7-day free trial, or buy VisuTokens outright, with no monthly commitment.",
  },
  '2': {
    title: 'Describe what you want',
    desc: 'A simple sentence is enough. Pick the model, the format, and let the AI work.',
    longDesc: 'Write in your own words. Pick the AI model, the aspect ratio, the duration (for video), and other details — or leave everything on default and just click Generate. Generation takes anywhere from seconds to a few minutes, depending on the type.',
  },
  '3': {
    title: 'Download and use it',
    desc: "In seconds you have the finished file, no watermark, yours to use anywhere.",
    longDesc: 'The result is saved to your account under "My Projects", and you can download it whenever you want — no watermark, high quality, ready to post, print, or use wherever you need it.',
  },
};
