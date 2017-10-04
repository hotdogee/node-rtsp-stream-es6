const child_process = require('child_process')
const EventEmitter = require('events')

class Mpeg1Muxer extends EventEmitter {

  constructor(options) {
    super(options)
    this.name = options.name
    
    this.stream = child_process.spawn('ffmpeg', ['-rtsp_transport', 'tcp', '-i', options.url, '-f', 'mpegts', '-codec:v', 'mpeg1video', '-'], { // -b 0 has bad quality
      detached: false
    })
    console.log(`${options.name} (pid: ${this.stream.pid}) ffmpeg starting`)
    
    this.stream.stdout.on('data', (chunk) => { this.emit('mpeg1data', chunk) })
    // this.stream.stderr.on('data', (chunk) => { this.emit('ffmpegError', chunk) })

    // detect errors
    this.stream.stdout.on('close', () => {
      console.log(`${this.name} (pid: ${this.stream.pid}) ERROR: STDOUT CLOSE`)
    })
    this.stream.stderr.on('close', () => {
      console.log(`${this.name} (pid: ${this.stream.pid}) ERROR: STDERR CLOSE`)
    })
    this.stream.on('close', (code, signal) => {
      console.log(`${this.name} (pid: ${this.stream.pid}) ERROR: SUBPROCESS CLOSE`)
    })
    this.stream.on('error', (err) => {
      console.log(`${this.name} (pid: ${this.stream.pid}) ERROR: SUBPROCESS ERROR`)
    })
    this.stream.on('exit', (code, signal) => {
      console.log(`${this.name} (pid: ${this.stream.pid}) ERROR: SUBPROCESS EXIT`)
      this.emit('exit', code, signal)
    })
  }
  
  kill() {
    console.log(`${this.name} (pid: ${this.stream.pid}) killing ffmpeg`)
    this.stream.stdout.removeAllListeners()
    this.stream.stderr.removeAllListeners()
    this.stream.removeAllListeners()
    this.stream.kill('SIGINT') // happy termination
    this.stream.on('error', err => {
      console.log(`${this.name} (pid: ${this.stream.pid}) SIGKILL ffmpeg`)
      this.stream.kill('SIGKILL')
      this.stream.removeAllListeners('error')
    })
    this.stream.on('exit', (code, signal) => {
      this.emit('exit', code, signal)
    })
  }
}

module.exports = Mpeg1Muxer
