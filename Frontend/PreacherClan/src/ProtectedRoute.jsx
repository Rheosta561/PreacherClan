import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';

const ProtectedRoute = ({ children }) => {
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [valid, setValid] = useState(false);

  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const urlToken = queryParams.get('token');

    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    const validate = async () => {
      try {
        let tokenToUse = storedToken;

        // Save token from URL if present
        if (urlToken) {
          localStorage.setItem('token', urlToken);
          tokenToUse = urlToken;
        }

        if (tokenToUse) {
          if (!storedUser) {
            const decoded = jwtDecode(tokenToUse);
            const response = await axios.get(`https://preacherclan.onrender.com/user/${decoded.userId}`);
            localStorage.setItem('user', JSON.stringify(response.data));
          }
          setValid(true);
        } else {
          setValid(false);
        }
      } catch (err) {
        console.error("Token validation failed", err);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setValid(false);
      }
      setLoading(false);
    };

    validate();
  }, [location.search]);

  if (loading) return null; 

  if (!valid) return <Navigate to="/login" replace />;

  return children;
};

export default ProtectedRoute;
