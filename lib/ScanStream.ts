import { Readable, ReadableOptions } from "stream";

interface Options extends ReadableOptions {
  key?: string;
  match?: string;
  type?: string;
  command: string;
  redis: any;
  count?: string | number;
  noValues?: boolean;
}

/**
 * Convenient class to convert the process of scanning keys to a readable stream.
 */
export default class ScanStream extends Readable {
  private _redisCursor = "0";
  private _redisDrained = false;

  constructor(private opt: Options) {
    super(opt);
  }

  _read() {
    if (this._redisDrained) {
      this.push(null);
      return;
    }

    const args: string[] = [this._redisCursor];
    if (this.opt.key) {
      args.unshift(this.opt.key);
    }
    if (this.opt.match) {
      args.push("MATCH", this.opt.match);
    }
    if (this.opt.type) {
      args.push("TYPE", this.opt.type);
    }
    if (this.opt.count) {
      args.push("COUNT", String(this.opt.count));
    }
    if (this.opt.noValues) {
      args.push("NOVALUES");
    }
    this.opt.redis[this.opt.command](args, (err, res) => {
      if (err) {
        this.emit("error", err);
        return;
      }
      this._redisCursor = res[0] instanceof Buffer ? res[0].toString() : res[0];
      if (this._redisCursor === "0") {
        this._redisDrained = true;
      }
      this.push(res[1]);
    });
  }

  close() {
    this._redisDrained = true;
  }
}
