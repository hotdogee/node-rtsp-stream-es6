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
    server.on('connection', (socket, request) => {
      console.log(`${this.name} ws connected (${server.clients.size} total): ${request.headers['x-real-ip']} ${request.headers['user-agent']}`) // ${request.headers['x-forwarded-for']}

      let streamHeader = new Buffer(8)
      streamHeader.write(STREAM_MAGIC_BYTES)
      streamHeader.writeUInt16BE(this.width, 4)
      streamHeader.writeUInt16BE(this.height, 6)      
      socket.send(streamHeader)

      socket.on('close', (code, reason) => {
        console.log(`${this.name} ws disconnected: ${code} ${reason} ${request.headers['x-real-ip']} ${request.headers['user-agent']}`)
      })
    })
  }

  start() {
    this.mpeg1Muxer = new Mpeg1Muxer({ url: this.url })    
    console.log(`${this.name} ffmpeg started`)
    this.mpeg1Muxer.on('mpeg1data', (data) => {  
      server.clients.forEach((client) => {
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
    this.mpeg1Muxer.on('ffmpegError', (data) => { return global.process.stderr.write(`${this.name} ${data}`) })

    this.mpeg1Muxer.on('exit', (code, signal) => {
      if (code) {
        console.log(`${this.name} ffmpeg exited code ${code}`)
      }
      else {
        console.log(`${this.name} ffmpeg exited signal ${signal}`)
      }
    })
  }
  
  stop() {
    this.mpeg1Muxer.kill()
  }
  
  restart() {
    this.stop()
    this.start()
  }
}

module.exports = VideoStream
