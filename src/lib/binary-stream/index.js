import utf8 from 'utf8';

class BinStream {
    constructor(size, littlEndian) {
        this.maxSize = 1024;
        this.dv = new DataView(new ArrayBuffer(this.maxSize));
        this._pos = 0;
        this.size = 0;
        this.littlEndian = littlEndian;
    }

    grow() {
        this.maxSize *= 2;
        const old_buffer = this.dv.buffer;
        this.dv = new DataView(new ArrayBuffer(this.maxSize));
        const newAr = new Uint8Array(this.dv.buffer);
        const oldAr = new Uint8Array(old_buffer);
        for (let i = 0; i < oldAr.length; i++) {
            newAr[i] = oldAr[i];
        }
    }

    checkSize(size) {
        if (this._pos + size >= this.maxSize) {
            this.grow();
        }
        const newPos = this._pos + size;
        this.size = (newPos > this.size) ? newPos : this.size;
    }

    writeUint8(value) {
        this.checkSize(1);
        this.dv.setUint8(this._pos, value);
        this._pos += 1;
    }

    writeInt8(value) {
        this.checkSize(1);
        this.dv.setInt8(this._pos, value);
        this._pos += 1;
    }

    writeInt16(value) {
        this.checkSize(2);
        this.dv.setInt16(this._pos, value, this.littlEndian);
        this._pos += 2;
    }

    writeUint16(value) {
        this.checkSize(2);
        this.dv.setUint16(this._pos, value, this.littlEndian);
        this._pos += 2;
    }

    writeInt32(value) {
        this.checkSize(4);
        this.dv.setInt32(this._pos, value, this.littlEndian);
        this._pos += 4;
    }

    writeUint32(value) {
        this.checkSize(4);
        this.dv.setUint32(this._pos, value, this.littlEndian);
        this._pos += 4;
    }

    writeString(s, zeroTerminated) {
        s = utf8.encode(s);
        for (let i = 0; i < s.length; i++) {
            this.writeUint8(s.charCodeAt(i));
        }
        if (zeroTerminated) {
            this.writeUint8(0);
        }
    }

    tell() {
        return this._pos;
    }

    seek(pos) {
        this._pos = pos;
    }

    getBuffer() {
        return this.dv.buffer.slice(0, this.size);
    }
}

export {BinStream};
