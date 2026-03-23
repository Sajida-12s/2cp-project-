const {server}= require('socket.io');
const { http } = require('winston');

let io;

function initSocket(server) {
    io= new server(httpServer, {
        cors:{origin:"*" }
    });

    io.on('connection', (socket) => {
        //Employee get connected somehow 
        socket.on('join',({employeeId})=>{
            socket.join(`employee_${employeeId}`);
            console.log(`Employee ${employeeId} joined their room`);
        });
        socket.on('disconnect',()=>{
            console.log('Client disconnected');
        });
    });
return io;
}

function getIO(){
    if(!io){
        throw new Error('Socket.io not initialized');
        return io;
    }

}

module.exports={initSocket,getIO};