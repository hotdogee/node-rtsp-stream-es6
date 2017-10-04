const child_process = require('child_process')
const EventEmitter = require('events')

class Mpeg1Muxer extends EventEmitter {

  constructor(options) {
    super(options)
    
    this.stream = child_process.spawn('ffmpeg', ['-rtsp_transport', 'tcp', '-i', options.url, '-f', 'mpegts', '-codec:v', 'mpeg1video', '-'], { // -b 0 has bad quality
      detached: false
    })
    
    this.stream.stdout.on('data', (chunk) => { this.emit('mpeg1data', chunk) })
    this.stream.stderr.on('data', (chunk) => { this.emit('ffmpegError', chunk) })

    // detect errors
    this.stream.stdout.on('close', () => {
      console.log(`ERROR: STDOUT CLOSE ${options.url}`)
    })
    this.stream.stderr.on('close', () => {
      console.log(`ERROR: STDERR CLOSE ${options.url}`)
    })
    this.stream.on('close', (code, signal) => {
      console.log(`ERROR: SUBPROCESS CLOSE ${options.url}`)
    })
    this.stream.on('error', (err) => {
      console.log(`ERROR: SUBPROCESS ERROR ${options.url}`)
    })
    this.stream.on('exit', (code, signal) => {
      console.log(`ERROR: SUBPROCESS EXIT ${options.url}`)
      this.emit('error', code, signal)
      this.emit('exit', code, signal)
    })
  }
  
  kill() {
    this.stream.stdout.removeAllListeners()
    this.stream.stderr.removeAllListeners()
    this.stream.removeAllListeners()
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
