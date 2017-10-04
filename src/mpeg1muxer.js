const child_process = require('child_process')
const EventEmitter = require('events')

class Mpeg1Muxer extends EventEmitter {

  constructor(options) {
    super(options)
    
    this.url = options.url
    
    this.stream = child_process.spawn('ffmpeg', ['-rtsp_transport', 'tcp', '-i', this.url, '-f', 'mpegts', '-codec:v', 'mpeg1video', '-'], {
      detached: false
    })
    
    this.stream.stdout.on('data', (chunk) => { this.emit('mpeg1data', chunk) })
    this.stream.stderr.on('data', (chunk) => { this.emit('ffmpegError', chunk) })
  }
  
  kill() {
    this.stream.stdout.removeAllListeners('data')
    this.stream.stderr.removeAllListeners('data')
    this.stream.kill('SIGINT') // happy termination
    this.stream.on('error', err => {
      this.stream.kill('SIGKILL')
      this.stream.removeAllListeners('error')
    })
    this.stream.on('exit', (code, signal) => {
      this.emit('exit', code, signal)
    })
  }
}

module.exports = Mpeg1Muxer
