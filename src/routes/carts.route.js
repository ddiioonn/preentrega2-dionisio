import express from 'express';
import fs from 'fs';
import CartsManager from '../dao/managers/cartManager.js';
import app from '../app.js';

const cartsRouter = express.Router();

// Crear una instancia de CartsManager
const cartsManager = new CartsManager();

// Función para cargar la lista de carritos desde el archivo.
function loadCartsFromFile() {
    try {
        const data = fs.readFileSync(cartsFilePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error al cargar los carritos desde el archivo', error);
        return [];
    }
}

// Función para guardar la lista de carritos en el archivo.
function saveCartsToFile(carts) {
    try {
        fs.writeFileSync(cartsFilePath, JSON.stringify(carts, null, 2), 'utf8');
    } catch (error) {
        console.error('Error al guardar los carritos en el archivo', error);
    }
}

// Ruta raíz POST /api/carts
cartsRouter.post('/', (req, res) => {
    try {
        const carts = loadCartsFromFile();
        // Verificar si ya existe un carrito con el mismo ID
        const newCartId = carts.reduce((maxId, cart) => Math.max(maxId, cart.id), 0) + 1;
        const newCart = cartsManager.createCart(newCartId);

        carts.push(newCart);
        saveCartsToFile(carts);

        res.status(201).json(newCart);
    } catch (error) {
        console.error('Error al crear el carrito', error);
        res.status(500).json({ error: 'Error al crear el carrito' });
    }
});

// Ruta GET /api/carts/:cid
cartsRouter.get('/:cid', (req, res) => {
    const cartId = parseInt(req.params.cid);
    try {
        const carts = loadCartsFromFile();
        const cart = carts.find(cart => cart.id === cartId);

        if (cart) {
            res.json(cart);
        } else {
            res.status(404).json({ error: 'Carrito no encontrado' });
        }
    } catch (error) {
        console.error('Error al obtener el carrito', error);
        res.status(500).json({ error: 'Error al obtener el carrito' });
    }
});

// Ruta POST /api/carts/:cid/product/:pid
cartsRouter.post('/:cid/product/:pid', async (req, res) => {
    try {
        const carts = loadCartsFromFile();
        const cartId = parseInt(req.params.cid);
        const productId = parseInt(req.params.pid);
        const quantity = parseInt(req.body.quantity);

        const cart = carts.find(cart => cart.id === cartId);
        if (!cart) {
            return res.status(404).json({ error: 'Carrito no encontrado' });
        }

        // Consulta el modelo de Carts para agregar el producto al carrito
        const product = await cartsModel.findById(productId);
        if (!product) {
            return res.status(400).json({ error: 'Producto no encontrado' });
        }

        const productExists = cart.products.some(item => item.productId === productId);
        if (!productExists) {
            return res.status(404).json({ error: 'Producto no encontrado en el carrito' });
        }

        const existingProduct = cart.products.find(item => item.productId === productId);
        if (existingProduct) {
            existingProduct.quantity += quantity;
        } else {
            cart.products.push({ productId, quantity });
        }

        saveCartsToFile(carts);
        res.status(200).json({ message: 'Producto agregado al carrito con éxito' });
    } catch (error) {
        console.error('Error al agregar el producto al carrito', error);
        res.status(500).json({ error: 'Error al agregar el producto al carrito' });
    }
});

// Ruta DELETE /api/carts/:cid/products/:pid
cartsRouter.delete('/:cid/products/:pid', (req, res) => {
    try {
        const carts = loadCartsFromFile();
        const cartId = parseInt(req.params.cid);
        const productId = parseInt(req.params.pid);

        const cart = carts.find(cart => cart.id === cartId);
        if (!cart) {
            return res.status(404).json({ error: 'Carrito no encontrado' });
        }

        const productIndex = cart.products.findIndex(item => item.productId === productId);
        if (productIndex === -1) {
            return res.status(404).json({ error: 'Producto no encontrado en el carrito' });
        }

        cart.products.splice(productIndex, 1); // Eliminar el producto del carrito
        saveCartsToFile(carts);
        res.status(200).json({ message: 'Producto eliminado del carrito con éxito' });
    } catch (error) {
        console.error('Error al eliminar el producto del carrito', error);
        res.status(500).json({ error: 'Error al eliminar el producto del carrito' });
    }
});

// Ruta DELETE /api/carts/:cid
cartsRouter.delete('/:cid', async (req, res) => {
    const cartId = parseInt(req.params.cid);
    try {
        // Consulta el modelo de Carts para eliminar todos los productos del carrito
        const cart = await cartsModel.findById(cartId);

        if (!cart) {
            return res.status(404).json({ error: 'Carrito no encontrado' });
        }

        cart.products = []; // Eliminar todos los productos del carrito
        await cart.save();
        res.status(200).json({ message: 'Todos los productos eliminados del carrito con éxito' });
    } catch (error) {
        console.error('Error al eliminar todos los productos del carrito', error);
        res.status(500).json({ error: 'Error al eliminar todos los productos del carrito' });
    }
});


// Ruta GET /api/carts/:cid
cartsRouter.get('/:cid', async (req, res) => {
    const cartId = parseInt(req.params.cid);
    try {
        const cart = await cartsModel.findById(cartId).populate('products'); //

        if (!cart) {
            return res.status(404).json({ error: 'Carrito no encontrado' });
        }

        res.json(cart);
    } catch (error) {
        console.error('Error al obtener el carrito', error);
        res.status(500).json({ error: 'Error al obtener el carrito' });
    }
});


// Ruta PUT /api/carts/:cid
cartsRouter.put('/:cid', (req, res) => {
    try {
        const carts = loadCartsFromFile();
        const cartId = parseInt(req.params.cid);
        const newProducts = req.body.products;

        const cart = carts.find(cart => cart.id === cartId);
        if (!cart) {
            return res.status(404).json({ error: 'Carrito no encontrado' });
        }

        if (!Array.isArray(newProducts)) {
            return res.status(400).json({ error: 'Formato de productos no válido' });
        }

        cart.products = newProducts; // Reemplazar los productos del carrito
        saveCartsToFile(carts);
        res.status(200).json({ message: 'Carrito actualizado con éxito' });
    } catch (error) {
        console.error('Error al actualizar el carrito', error);
        res.status(500).json({ error: 'Error al actualizar el carrito' });
    }
});

// Ruta PUT /api/carts/:cid/products/:pid
cartsRouter.put('/:cid/products/:pid', (req, res) => {
    try {
        const carts = loadCartsFromFile();
        const cartId = parseInt(req.params.cid);
        const productId = parseInt(req.params.pid);
        const newQuantity = parseInt(req.body.quantity);

        const cart = carts.find(cart => cart.id === cartId);
        if (!cart) {
            return res.status(404).json({ error: 'Carrito no encontrado' });
        }

        const product = cart.products.find(item => item.productId === productId);
        if (!product) {
            return res.status(404).json({ error: 'Producto no encontrado en el carrito' });
        }

        product.quantity = newQuantity; // Actualizar la cantidad del producto en el carrito
        saveCartsToFile(carts);
        res.status(200).json({ message: 'Cantidad de producto actualizada con éxito' });
    } catch (error) {
        console.error('Error al actualizar la cantidad del producto en el carrito', error);
        res.status(500).json({ error: 'Error al actualizar la cantidad del producto en el carrito' });
    }
});

export default cartsRouter;