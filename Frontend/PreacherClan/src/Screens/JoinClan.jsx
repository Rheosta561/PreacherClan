import React from 'react'
import bg from '../assets/bg.jpg'
import JoinClanCard from '../Components/JoinClanCard'
function JoinClan() {
  return (
    <div className='h-screen w-screen'>
        <img src={bg} alt="" className=' absolute inset-0 h-full w-full object-cover' />

        <div className='relative p-4 '>
            <h1 className='text-white text-4xl opacity-90 font-semibold'>
                Clan
            </h1>
            <div className='h-14 mt-2 w-full bg-[rgba(255,255,255,0.1)] flex items-center justify-center rounded-lg'>
                <p className='text-zinc-300 text-sm '>Join the Gym and become a Preacher</p>
            </div>
            <div className='h-44 w-full bg-zinc-950 mt-2 rounded-lg'>
                <JoinClanCard/>
            </div>
            <div className='h-14 w-full bg-[rgba(255,255,255,0.14)] mt-4 rounded-lg flex items-center justify-center'>
                <p className='text-zinc-300 text-sm '>Enter the Clan Code , eg: 123456</p>
            </div>
            <div className='w-full flex items-center justify-center gap-2 mt-2'>
                <hr className='w-1/2 border-zinc-50 opacity-30 border' />
                <span className='text-zinc-300 opacity-75 text-lg'>Or</span>
                <hr className='w-1/2 border-zinc-50 opacity-30 border' />

            </div>

            <div className='h-14 w-full md:w-1/3 mx-auto bg-zinc-950 mt-2 rounded-lg flex items-center justify-center'>
                <p className='text-zinc-300 font-semibold  '>Scan QR</p>
            </div>
            <div className='w-full text-center text-sm mt-4 text-zinc-300 opacity-80'>
                Please scan the QR code available at your gym . If you don't have one , please contact your gym manager for any assistance.
            </div>

            <div className='w-full h-32 bg-[rgba(255,255,255,0.1)] mt-12 rounded-lg flex items-center justify-center p-6'>
                <p className='text-zinc-100 text-center text-xs opacity-60'>This Gym is officially certified and verified by Preacher Clan , ensuring the highest quality of service and safety for all members. However , Preacher Clan is not liable for any injuries or accidents that may occur at the gym.</p>

            </div>
          
        </div>
    </div>
  )
}

export default JoinClan