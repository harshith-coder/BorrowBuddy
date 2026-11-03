let io;

const setSocketServer = (socketServer) => {
  io = socketServer;
};

const emitToUser = (userId, event, payload) => {
  if (io) {
    io.to(`user:${userId.toString()}`).emit(event, payload);
  }
};

module.exports = { setSocketServer, emitToUser };
