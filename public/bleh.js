const handleUpload = async () => {
  if (!selectedFile) return;

  setLoading(true);
  setError(null);

  try {
    const fileName = selectedFile.name.toLowerCase();

    if (fileName.endsWith(".kml")) {
      // Handle KML file
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const kmlContent = e.target.result;
          onKMLLoad(selectedFile.name, kmlContent);
          setSelectedFile(null);
          setLoading(false);
        } catch (err) {
          setError("Error reading KML file");
          setLoading(false);
        }
      };
      reader.readAsText(selectedFile);
    } else if (fileName.endsWith(".kmz")) {
      // Handle KMZ file
      const kmlData = await extractKMLFromKMZ(selectedFile);
      onKMLLoad(kmlData.name, kmlData.content);
      setSelectedFile(null);
      setLoading(false);
    }
  } catch (err) {
    setError(err.message || "Error processing file");
    setLoading(false);
  }
};
