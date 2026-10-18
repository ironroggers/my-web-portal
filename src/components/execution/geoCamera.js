// openGeoCamera({ mode: "photo" | "video", source: "camera" | "library" }) resolves to a
// captured item (file + MediaFile metadata) or null. GeoCameraHost (WebGeoCamera.jsx),
// mounted once in App.jsx, registers the opener.
let opener = null;

export const registerGeoCamera = (fn) => {
  opener = fn;
  return () => {
    if (opener === fn) opener = null;
  };
};

export const openGeoCamera = (options) => (opener ? opener(options) : Promise.resolve(null));
