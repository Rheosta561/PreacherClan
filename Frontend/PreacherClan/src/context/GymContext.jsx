import React, { createContext, useContext, useState } from 'react';

// Create context
const GymContext = createContext();

// Provider component
export const GymProvider = ({ children }) => {

  const [gyms, setGyms] = useState([]);


  const [selectedGym, setSelectedGym] = useState(null);

  return (
    <GymContext.Provider value={{
      gyms,
      setGyms,
      selectedGym,
      setSelectedGym
    }}>
      {children}
    </GymContext.Provider>
  );
};


export const useGym = () => {
  return useContext(GymContext);
};
