const WorkoutJam = require("../Models/WorkoutJamSchema");
const User = require("../Models/User");
const jamState = require("./jamState");

module.exports = function workoutJamSocket(io, socket) {

  /* =========================
     JOIN JAM
  ========================= */
 socket.on("jam:join", async ({ jamCode, userId }) => {
  const jam = await WorkoutJam.findOne({ jamCode })
    .populate("participants.user", "name username preacherScore");

  if (!jam) return socket.emit("jam:error", "Jam not found");

  socket.join(jam._id.toString());

  const participants = jam.participants.map(p => ({
    _id: p.user._id,
    name: p.user.name,
    username: p.user.username,
    preacherScore: p.user.preacherScore,
  }));

  io.to(jam._id.toString()).emit("jam:userJoined", {
    participants,
    leaderId: jam.leader.toString(),
  });
});


  /* =========================
     START JAM (LEADER)
  ========================= */
  socket.on("jam:start", async ({ jamId, userId }) => {
  const jam = await WorkoutJam.findById(jamId);
  if (!jam) return;
  if (jam.leader.toString() !== userId) return;

// initialising jam state 
  jamState.set(jamId, {
    currentExerciseIndex: 0,
    participants: jam.participants.reduce((acc, p) => {
      acc[p.user.toString()] = { completed: false };
      return acc;
    }, {}),
  });

  jam.state = "active";
  jam.startedAt = new Date();
  await jam.save();

  io.to(jamId).emit("jam:started", {
    exerciseIndex: 0,
    exercise: jam.exercises[0],
  });
});


  /* =========================
     MARK EXERCISE COMPLETE
  ========================= */
  socket.on("jam:exerciseCompleted", async ({ jamId, userId }) => {
    const state = jamState.get(jamId);
    if (!state) return;

    state.participants[userId].completed = true;

    io.to(jamId).emit("jam:userCompleted", { userId });

    const allDone = Object.values(state.participants)
      .every(p => p.completed);

    if (!allDone) return;

    // reset flags
    Object.keys(state.participants).forEach(id => {
      state.participants[id].completed = false;
    });

    const jam = await WorkoutJam.findById(jamId);
    state.currentExerciseIndex++;

    /* ===== END JAM ===== */
    if (state.currentExerciseIndex >= jam.exercises.length) {
      jam.state = "completed";
      jam.endedAt = new Date();
      await jam.save();

      await User.updateMany(
        { _id: { $in: Object.keys(state.participants) } },
        { $inc: { preacherScore: 20 } }
      );

      io.to(jamId).emit("jam:completed", {
        reward: 20,
      });

      jamState.delete(jamId);
      return;
    }

// next exercise 
    io.to(jamId).emit("jam:nextExercise", {
      exerciseIndex: state.currentExerciseIndex,
      exercise: jam.exercises[state.currentExerciseIndex],
    });
  });
};
