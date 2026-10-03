import React from 'react';
import bg from '../assets/bg.jpg';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';

const Login = () => {
    const navigate = useNavigate();
    
    const handleClick = () => {
        navigate('/signup');
    };

    const handleGoogleLogin = () => {
        window.location.href = "http://localhost:3000/auth/google";
    };
    

    return (
        <div className='relative'>
            <img src={bg} alt="" className='h-screen w-screen object-cover absolute inset-0' />
            <div className="flex items-center justify-center min-h-screen relative">
                <div className="bg-[#1312124f] p-8 rounded-lg shadow-lg w-96">
                    <h2 className="text-[#fffefedb] text-2xl font-semibold mb-6 text-center">Login</h2>
                    
                    <div className="flex space-x-4 mb-4">
                        <button 
                            onClick={handleGoogleLogin} 
                            className="flex-1 bg-[#000000a9] hover:bg-zinc-950 transition-all text-zinc-100 text-sm py-3 px-4 rounded flex items-center justify-center shadow"
                        >
                            <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5 mr-2" />
                            Log in with Google
                        </button>
                    </div>
                    
                    <div className="text-zinc-200 text-center justify-between w-full items-center gap-4 flex my-4">
                        <hr className='border-zinc-300 w-1/2'/>
                        <p>Or</p>
                        <hr className='border-zinc-300 w-1/2'/>
                    </div>
                    
                    <form>
                        <div className="mb-4">
                            <label className="text-zinc-200 text-sm">Username</label>
                            <input type="email" placeholder="Enter Your Username" className="w-full p-3 mt-1 bg-[#0000004b] text-white rounded text-sm" />
                        </div>
                        <div className="mb-4">
                            <label className="text-zinc-200 text-sm">Password</label>
                            <input type="password" placeholder="••••••••" className="w-full p-2 mt-1 bg-[#0000004b] text-white rounded" />
                        </div>
                        
                        <div className="flex justify-between items-center mb-4">
                            <label className="text-zinc-200 text-sm flex items-center">
                                <input type="checkbox" className="mr-2" /> Remember me
                            </label>
                            <a href="#" className="text-zinc-200 text-sm">Forgot password?</a>
                        </div>
                        
                        <button className="w-full bg-[#000000a9] hover:bg-zinc-950 transition-all text-sm text-white py-3 rounded shadow">Sign in to your account</button>
                    </form>
                    
                    <div className="text-zinc-200 text-center mt-4">
                        Don't have an account yet? <a onClick={handleClick} className="text-blue-600 underline">Sign up here</a>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
