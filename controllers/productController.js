import {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
} from '../controllers/productService.js';


export async function getAllProducts(req, res){
    try{
        const {search, page, limit, category, active} = req.query;
        const result = await listProducts({search, page, limit, category, active});
        res.set('x-total-count', result.total.toString());
        return res.json(result);
    }catch(err){
        console.error("getAllProducts error:", err);
        return res.status(500).json({ message: err.message || "Server error" });
    }
}

export async function getProductById(req, res){
    try{
        const product = await getProduct(req.params.id);
        return res.json(product);
    }catch(err){
        return res.status(400).json({ message: err.message});
    }
}

export async function createProductCtrl(req, res){
    try{
        const product = await createProduct(req.body);
        return res.status(200).json(product);
    }catch(err){
        return res.status(400).json({ message: err.message});
    }
}

export async function updateProductCtrl(req, res){
    try{
        const productId = req.params.id;
        const product = await updateProduct(productId, req.body);
        return res.status(200).json(product);
    }catch(err){
         const code = err.message === "Product not found" ? 404 : 400;
         return res.status(code).json({ message: err.message });
    }
}

export async function deleteProductCtrl(req, res){
    try{
        const productId = req.params.id;
        const delproduct = await deleteProduct(productId)
         return res.json({ message: "Product deleted successfully" });
    }catch(err){
         const code = err.message === "Product not found" ? 404 : 400;
         return res.status(code).json({ message: err.message });
    }
}