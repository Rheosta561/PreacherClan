import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom';

function ProtectedRoute({children})
{
    const navigate = useNavigate();

   useEffect(() => {
     if(!localStorage.getItem('user')){
        navigate('/login');
    }
   

   }, [navigate]);
   
  return children;
}

export default ProtectedRoute