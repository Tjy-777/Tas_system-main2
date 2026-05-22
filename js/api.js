export const API = {
    async fetchProducts() {
        const response = await fetch('php/api_products.php');
        const data = await response.json();
        console.log("取得したデータ:", data); // ←ここでF12のコンソールにデータが出るか確認！
        return data;
    }
};