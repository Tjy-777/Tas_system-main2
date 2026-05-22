// store.js

export class CartStore {
    constructor() {
        this.cart = [];
        this.products = {};
    }

    setProducts(products) {
        this.products = products;
    }

    add(code) {
        const product = this.products[code];
        if (!product) return null;

        const exist = this.cart.find(item => item.id === code);
        if (exist) {
            exist.qty++;
        } else {
            this.cart.push({ id: code, ...product, qty: 1 });
        }
        return product;
    }

    changeQty(id, delta) {
        const item = this.cart.find(i => i.id === id);
        if (item) {
            item.qty += delta;
            if (item.qty <= 0) {
                this.cart = this.cart.filter(i => i.id !== id);
            }
        }
    }

    clear() {
        this.cart = [];
    }

    getTotal() {
        return this.cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    }
}