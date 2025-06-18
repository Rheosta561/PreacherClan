import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';

const ProtectedRoute = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [valid, setValid] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');

    const validate = async () => {
      if (token && !user) {
        try {
          const decoded = jwtDecode(token);
          const response = await axios.get(`https://preacherclan.onrender.com/user/${decoded.userId}`);
          localStorage.setItem('user', JSON.stringify(response.data));
          setValid(true);
        } catch (err) {
          console.error("Invalid token or failed to fetch user", err);
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setValid(false);
        }
      } else if (token && user) {
        setValid(true);
      } else {
        setValid(false);
      }
      setLoading(false);
    };

    validate();
  }, []);

  if (loading) return null; 

  if (!valid) return <Navigate to="/login" replace />;

  return children;
};

export default ProtectedRoute;
