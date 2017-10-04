const WebSocket = require('ws')
const EventEmitter = require('events')
const STREAM_MAGIC_BYTES = "jsmp"
const Mpeg1Muxer = require('./mpeg1muxer')

class VideoStream extends EventEmitter {

  constructor(options) {
    super(options)
    this.name = options.name
    this.url = options.url
    this.width = options.width
    this.height = options.height
    this.port = options.port
    this.stream = void 0
    this.server = new WebSocket.Server({
      port: this.port,
      clientTracking: true
    })
    this.server.on('connection', (socket, request) => {
      console.log(`${this.name} ws connected (${this.server.clients.size} total): ${request.headers['x-real-ip']} ${request.headers['user-agent']}`) // ${request.headers['x-forwarded-for']}

      let streamHeader = new Buffer(8)
      streamHeader.write(STREAM_MAGIC_BYTES)
      streamHeader.writeUInt16BE(this.width, 4)
      streamHeader.writeUInt16BE(this.height, 6)      
      socket.send(streamHeader)

      socket.on('close', (code, reason) => {
        console.log(`${this.name} ws disconnected (${this.server.clients.size} left): ${request.headers['x-real-ip']} ${request.headers['user-agent']}`)
      })
    })
  }

  start() {
    this.mpeg1Muxer = new Mpeg1Muxer({ url: this.url, name: this.name })    
    this.mpeg1Muxer.on('mpeg1data', (data) => {  
      this.server.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(data)
        }
      })
    })

    let gettingInputData = false
    let gettingOutputData = false
    let inputData = []
    let outputData = []

    this.mpeg1Muxer.on('ffmpegError', (data) => {
      data = data.toString()
      if (data.indexOf('Input #') !== -1) { gettingInputData = true }
      if (data.indexOf('Output #') !== -1) {
        gettingInputData = false
        gettingOutputData = true
      }
      if (data.indexOf('frame') === 0) { gettingOutputData = false }
      if (gettingInputData) {
        inputData.push(data.toString())
        let size = data.match(/\d+x\d+/)
        if (size != null) {
          size = size[0].split('x')
          if (this.width == null) { this.width = parseInt(size[0], 10) }
          if (this.height == null) { return this.height = parseInt(size[1], 10) }
        }
      }
    })

    this.mpeg1Muxer.on('ffmpegError', (data) => {
      global.process.stderr.write(`${this.name} ${data}`)
    })

    this.mpeg1Muxer.on('exit', (code, signal) => {
      if (code) {
        console.log(`${this.name} (pid: ${this.mpeg1Muxer.stream.pid}) ffmpeg exited code ${code}`)
      }
      else {
        console.log(`${this.name} (pid: ${this.mpeg1Muxer.stream.pid}) ffmpeg exited signal ${signal}`)
      }
      this.mpeg1Muxer.removeAllListeners()
      this.start()
    })
  }
  
  restart() {
    console.log(`${this.name} (pid: ${this.mpeg1Muxer.stream.pid}) ffmpeg restarting`)
    if (this.mpeg1Muxer && !this.mpeg1Muxer.killed) {// make sure process is still alive
      this.mpeg1Muxer.kill()
    }
  }
}

module.exports = VideoStream
