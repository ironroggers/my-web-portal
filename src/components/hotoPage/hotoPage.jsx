import { useLocation } from "react-router-dom";

const HotoPage = () => {
  const location = useLocation();
  const locationId = location.state?.locationId;

  return (
    <div>
      <h1>HOTO Information</h1>
      <p>Location ID: {locationId}</p>
    </div>
  );
};

export default HotoPage;
